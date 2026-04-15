from fastapi import APIRouter, Depends, UploadFile, File
from datetime import date
import re
from app.db.database import supabase, supabase_admin
from app.core.logger import setup_logger
from app.core.exceptions import (
    BadRequestException,
    RateLimitExceededException,
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
    """Normalize exam name for smart deduplication."""
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
    """
    Upload admit card (PDF or image) → AI extracts all exam details.
    Free users: 3 parses/day. Premium users: 20 parses/day.
    """
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

    parsed_data = parse_admit_card(file_bytes, file.content_type)

    # Safe file path — no None errors
    exam_name_safe = (parsed_data.get('exam_name') or 'exam').replace(' ', '_').replace('/', '_')
    file_path = f"{user_id}/{exam_name_safe}_{date.today().isoformat()}"

    try:
        supabase_admin.storage.from_("admit-cards").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type},
        )
        admit_card_url = supabase_admin.storage.from_("admit-cards").get_public_url(file_path)
    except Exception as e:
        logger.warning(f"Storage upload failed: {e}")
        admit_card_url = None

    exam_payload = {
        "user_id": user_id,
        "exam_name": parsed_data.get("exam_name"),
        "exam_date": parsed_data.get("exam_date"),
        "reporting_time": parsed_data.get("reporting_time"),
        "gate_closing_time": parsed_data.get("gate_closing_time"),
        "center_name": parsed_data.get("center_name"),
        "center_address": parsed_data.get("center_address"),
        "center_city": parsed_data.get("center_city"),
        "roll_number": parsed_data.get("roll_number"),
        "instructions": parsed_data.get("instructions"),
        "raw_extracted_text": parsed_data.get("raw_text"),
        "admit_card_url": admit_card_url,
    }

    exam_name = exam_payload.get("exam_name") or ""
    normalized_new = normalize_exam_name(exam_name)

    all_exams = supabase_admin.table("exams").select("id, exam_name").eq(
        "user_id", user_id
    ).execute()

    matched_id = None
    if all_exams.data:
        # Pass 1 — exact normalized match
        for ex in all_exams.data:
            if normalize_exam_name(ex.get("exam_name", "")) == normalized_new:
                matched_id = ex["id"]
                break

        # Pass 2 — partial match (one contains the other)
        if not matched_id:
            for ex in all_exams.data:
                existing_norm = normalize_exam_name(ex.get("exam_name", ""))
                if existing_norm in normalized_new or normalized_new in existing_norm:
                    matched_id = ex["id"]
                    break

    if matched_id:
        exam = supabase_admin.table("exams").update(
            exam_payload
        ).eq("id", matched_id).execute()
        logger.info(f"Exam updated for user {user_id}: {exam_name}")
    else:
        exam = supabase_admin.table("exams").insert(exam_payload).execute()
        logger.info(f"Exam created for user {user_id}: {exam_name}")

    return {
        "success": True,
        "message": "Admit card parsed successfully.",
        "exam": exam.data[0],
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
async def get_exam_by_id(exam_id: str, user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    exam = supabase.table("exams").select("*").eq(
        "id", exam_id
    ).eq("user_id", user_id).single().execute()
    if not exam.data:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Exam not found.")
    return {"success": True, "exam": exam.data}


@router.delete("/exams/{exam_id}")
async def delete_exam(exam_id: str, user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    supabase.table("exams").delete().eq(
        "id", exam_id
    ).eq("user_id", user_id).execute()
    return {"success": True, "message": "Exam deleted successfully."}