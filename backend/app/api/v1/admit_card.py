from fastapi import APIRouter, Depends, UploadFile, File
from datetime import date
from app.db.database import supabase, supabase_admin
from app.core.logger import setup_logger
from app.core.exceptions import (
    BadRequestException,
    RateLimitExceededException,
    InternalServerException,
)
from app.dependencies import get_current_user
from app.services.ai_parser import parse_admit_card
from app.config import settings

router = APIRouter()
logger = setup_logger(__name__)

# Allowed file types
ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "application/pdf",
]

# Max file size 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024


def check_and_increment_parse_limit(user_id: str, is_premium: bool) -> None:
    """
    Checks if user has exceeded daily parse limit.
    Resets count if last parse was on a different day.
    Raises RateLimitExceededException if limit exceeded.
    """
    today = date.today().isoformat()
    limit = (
        settings.PREMIUM_TIER_DAILY_PARSE_LIMIT
        if is_premium
        else settings.FREE_TIER_DAILY_PARSE_LIMIT
    )

    # Get current profile
    profile = supabase_admin.table("profiles").select(
        "daily_parse_count, last_parse_date"
    ).eq("id", user_id).single().execute()

    current_count = profile.data["daily_parse_count"] or 0
    last_parse_date = profile.data["last_parse_date"]

    # Reset count if it's a new day
    if last_parse_date != today:
        current_count = 0

    if current_count >= limit:
        raise RateLimitExceededException(
            f"Daily limit of {limit} parses reached. "
            + ("" if is_premium else "Upgrade to premium for more.")
        )

    # Increment count
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

    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise BadRequestException(
            "Invalid file type. Only JPG, PNG, and PDF are allowed."
        )

    # Read file and validate size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise BadRequestException("File too large. Maximum size is 10MB.")

    # Get user profile to check premium status
    profile = supabase_admin.table("profiles").select(
        "is_premium"
    ).eq("id", user_id).single().execute()

    is_premium = profile.data.get("is_premium", False)

    # Check rate limit and increment
    check_and_increment_parse_limit(user_id, is_premium)

    # Call Gemini AI parser
    parsed_data = parse_admit_card(file_bytes, file.content_type)

    # Upload admit card file to Supabase Storage
    file_path = f"{user_id}/{parsed_data.get('exam_name', 'exam').replace(' ', '_')}_{date.today().isoformat()}"

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

    # Save exam details to database
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

    exam = supabase_admin.table("exams").insert(exam_payload).execute()

    logger.info(f"Exam saved for user {user_id}: {parsed_data.get('exam_name')}")

    return {
        "success": True,
        "message": "Admit card parsed successfully.",
        "exam": exam.data[0],
        "parsed": parsed_data,
    }


@router.get("/exams")
async def get_all_exams(user: dict = Depends(get_current_user)):
    """
    Returns all exams uploaded by the logged in user.
    """
    user_id = user["sub"]

    exams = supabase.table("exams").select("*").eq(
        "user_id", user_id
    ).order("exam_date", desc=False).execute()

    return {
        "success": True,
        "exams": exams.data,
    }


@router.get("/exams/{exam_id}")
async def get_exam_by_id(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Returns a single exam by ID for the logged in user.
    """
    user_id = user["sub"]

    exam = supabase.table("exams").select("*").eq(
        "id", exam_id
    ).eq("user_id", user_id).single().execute()

    if not exam.data:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Exam not found.")

    return {
        "success": True,
        "exam": exam.data,
    }


@router.delete("/exams/{exam_id}")
async def delete_exam(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Deletes an exam by ID for the logged in user.
    """
    user_id = user["sub"]

    supabase.table("exams").delete().eq(
        "id", exam_id
    ).eq("user_id", user_id).execute()

    return {
        "success": True,
        "message": "Exam deleted successfully.",
    }