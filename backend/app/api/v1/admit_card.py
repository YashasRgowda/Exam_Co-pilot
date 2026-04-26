from fastapi import APIRouter, Depends, UploadFile, File
from datetime import date
import re
from app.db.database import supabase, supabase_admin
from app.core.logger import setup_logger
from app.core.exceptions import (
    BadRequestException,
    RateLimitExceededException,
    NotFoundException,
)
from app.dependencies import get_current_user
from app.services.ai_parser import parse_admit_card
from app.config import settings

router = APIRouter()
logger = setup_logger(__name__)

ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
]

MAX_FILE_SIZE = 10 * 1024 * 1024


def normalize_exam_name(name: str) -> str:
    if not name:
        return ""
    name = name.lower().strip()
    name = re.sub(r'[^a-z0-9\s]', '', name)
    name = re.sub(r'\s+', ' ', name)
    return name


def check_and_increment_parse_limit(user_id: str, is_premium: bool) -> None:
    today = date.today().isoformat()
    limit = (
        settings.PREMIUM_TIER_DAILY_PARSE_LIMIT
        if is_premium
        else settings.FREE_TIER_DAILY_PARSE_LIMIT
    )

    profile = supabase_admin.table("profiles").select(
        "daily_parse_count, last_parse_date"
    ).eq("id", user_id).single().execute()

    current_count = profile.data["daily_parse_count"] or 0
    last_parse_date = profile.data["last_parse_date"]

    if last_parse_date != today:
        current_count = 0

    if current_count >= limit:
        raise RateLimitExceededException(
            f"Daily limit of {limit} parses reached. "
            + ("" if is_premium else "Upgrade to premium for more.")
        )

    supabase_admin.table("profiles").update({
        "daily_parse_count": current_count + 1,
        "last_parse_date": today,
    }).eq("id", user_id).execute()


@router.post("/parse")
async def parse_admit_card_route(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    user_id = user["sub"]

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise BadRequestException(
            "Invalid file type. Only JPG, PNG, and PDF are allowed."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise BadRequestException("File too large. Maximum size is 10MB.")

    profile = supabase_admin.table("profiles").select(
        "is_premium"
    ).eq("id", user_id).single().execute()

    is_premium = profile.data.get("is_premium", False)
    check_and_increment_parse_limit(user_id, is_premium)

    # ── PARSE ADMIT CARD ──
    parsed_data = parse_admit_card(file_bytes, file.content_type)

    # ── GET SESSIONS ──
    sessions = parsed_data.get("sessions", [])
    if not sessions:
        raise BadRequestException(
            "Could not extract exam sessions. Please try a clearer image."
        )

    # ── FIRST SESSION DATE for exams table sorting ──
    # exams.exam_date = date of first session
    # This is only used for sorting on home screen
    first_session = sessions[0]
    first_session_date = first_session.get("exam_date")

    if not first_session_date:
        raise BadRequestException(
            "Could not find exam date. Please try a clearer image."
        )

    # ── UPLOAD FILE TO STORAGE ──
    exam_name_safe = (
        parsed_data.get('exam_name') or 'exam'
    ).replace(' ', '_').replace('/', '_')
    file_path = f"{user_id}/{exam_name_safe}_{date.today().isoformat()}"

    admit_card_url = None
    try:
        supabase_admin.storage.from_("admit-cards").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type},
        )
        admit_card_url = supabase_admin.storage.from_(
            "admit-cards"
        ).get_public_url(file_path)
    except Exception as e:
        logger.warning(f"Storage upload failed: {e}")

    # ── BUILD EXAM PAYLOAD ──
    # exam_date = first session date (for home screen sorting)
    # reporting_time and gate_closing_time are now NULL
    # Real timings live in exam_sessions table
    exam_payload = {
        "user_id": user_id,
        "exam_name": parsed_data.get("exam_name"),
        "exam_date": first_session_date,
        "reporting_time": None,
        "gate_closing_time": None,
        "center_name": parsed_data.get("center_name"),
        "center_address": parsed_data.get("center_address"),
        "center_city": parsed_data.get("center_city"),
        "roll_number": parsed_data.get("roll_number"),
        "instructions": parsed_data.get("instructions"),
        "raw_extracted_text": parsed_data.get("raw_text"),
        "admit_card_url": admit_card_url,
    }

    # ── SMART DEDUPLICATION ──
    # If student uploads same exam again → update, don't create duplicate
    exam_name = exam_payload.get("exam_name") or ""
    normalized_new = normalize_exam_name(exam_name)

    all_exams = supabase_admin.table("exams").select(
        "id, exam_name"
    ).eq("user_id", user_id).execute()

    matched_id = None
    if all_exams.data:
        # Pass 1 — exact normalized match
        for ex in all_exams.data:
            if normalize_exam_name(ex.get("exam_name", "")) == normalized_new:
                matched_id = ex["id"]
                break

        # Pass 2 — partial match
        if not matched_id:
            for ex in all_exams.data:
                existing_norm = normalize_exam_name(ex.get("exam_name", ""))
                if (
                    existing_norm in normalized_new
                    or normalized_new in existing_norm
                ):
                    matched_id = ex["id"]
                    break

    if matched_id:
        exam = supabase_admin.table("exams").update(
            exam_payload
        ).eq("id", matched_id).execute()
        exam_id = matched_id
        logger.info(f"Exam updated: {exam_name}")

        # Delete old sessions — we'll re-insert fresh ones
        supabase_admin.table("exam_sessions").delete().eq(
            "exam_id", exam_id
        ).execute()
        logger.info(f"Old sessions deleted for exam: {exam_id}")
    else:
        exam = supabase_admin.table("exams").insert(
            exam_payload
        ).execute()
        exam_id = exam.data[0]["id"]
        logger.info(f"Exam created: {exam_name}")

    # ── INSERT ALL SESSIONS ──
    sessions_to_insert = []
    for s in sessions:
        session_date = s.get("exam_date")
        start_time = s.get("start_time")

        # Skip sessions with missing critical data
        if not session_date or not start_time:
            logger.warning(
                f"Skipping session {s.get('session_number')} "
                f"— missing date or start_time"
            )
            continue

        sessions_to_insert.append({
            "exam_id": exam_id,
            "user_id": user_id,
            "session_number": s.get("session_number", 1),
            "subject_name": s.get("subject_name"),
            "exam_date": session_date,
            "start_time": start_time,
            "end_time": s.get("end_time"),
        })

    if sessions_to_insert:
        inserted_sessions = supabase_admin.table("exam_sessions").insert(
            sessions_to_insert
        ).execute()
        logger.info(
            f"Inserted {len(sessions_to_insert)} sessions "
            f"for exam: {exam_name}"
        )
    else:
        raise BadRequestException(
            "No valid sessions found. Please try a clearer image."
        )

    # ── RETURN RESPONSE ──
    exam_data = exam.data[0]
    exam_data["sessions"] = inserted_sessions.data

    return {
        "success": True,
        "message": "Admit card parsed successfully.",
        "exam": exam_data,
        "sessions": inserted_sessions.data,
        "parsed": parsed_data,
    }


@router.get("/exams")
async def get_all_exams(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    exams = supabase.table("exams").select("*").eq(
        "user_id", user_id
    ).order("exam_date", desc=False).execute()
    return {"success": True, "exams": exams.data}


@router.get("/exams/{exam_id}")
async def get_exam_by_id(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    user_id = user["sub"]
    exam = supabase.table("exams").select("*").eq(
        "id", exam_id
    ).eq("user_id", user_id).single().execute()
    if not exam.data:
        raise NotFoundException("Exam not found.")

    # Also fetch sessions
    sessions = supabase.table("exam_sessions").select("*").eq(
        "exam_id", exam_id
    ).order("session_number", desc=False).execute()

    return {
        "success": True,
        "exam": exam.data,
        "sessions": sessions.data,
    }


@router.delete("/exams/{exam_id}")
async def delete_exam(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    user_id = user["sub"]
    supabase.table("exams").delete().eq(
        "id", exam_id
    ).eq("user_id", user_id).execute()
    return {"success": True, "message": "Exam deleted successfully."}