from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.db.database import supabase, supabase_admin
from app.core.logger import setup_logger
from app.core.exceptions import BadRequestException, NotFoundException
from app.dependencies import get_current_user

router = APIRouter()
logger = setup_logger(__name__)


# ---------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------
class SubmitFeedbackRequest(BaseModel):
    exam_id: str
    security_strictness: int       # 1 to 5
    locker_available: bool
    parking_available: bool
    location_difficulty: int       # 1 to 5
    entry_gate_tips: Optional[str] = None
    additional_tips: Optional[str] = None


# ---------------------------------------------------------------
# Routes
# ---------------------------------------------------------------

@router.post("/submit")
async def submit_feedback(
    payload: SubmitFeedbackRequest,
    user: dict = Depends(get_current_user)
):
    """
    Student submits post exam feedback about the exam center.
    This builds the crowd intelligence database.
    Future students benefit from this data.
    """
    user_id = user["sub"]

    # Validate rating ranges
    if not 1 <= payload.security_strictness <= 5:
        raise BadRequestException("Security strictness must be between 1 and 5.")
    if not 1 <= payload.location_difficulty <= 5:
        raise BadRequestException("Location difficulty must be between 1 and 5.")

    # Get exam to fetch center address
    exam = supabase.table("exams").select(
        "center_address, center_city, center_name"
    ).eq("id", payload.exam_id).eq("user_id", user_id).single().execute()

    if not exam.data:
        raise NotFoundException("Exam not found.")

    feedback_data = {
        "user_id": user_id,
        "exam_id": payload.exam_id,
        "center_address": exam.data["center_address"],
        "center_city": exam.data["center_city"],
        "security_strictness": payload.security_strictness,
        "locker_available": payload.locker_available,
        "parking_available": payload.parking_available,
        "location_difficulty": payload.location_difficulty,
        "entry_gate_tips": payload.entry_gate_tips,
        "additional_tips": payload.additional_tips,
    }

    result = supabase_admin.table("exam_center_feedback").insert(
        feedback_data
    ).execute()

    logger.info(f"Feedback submitted for exam center: {exam.data['center_name']}")

    return {
        "success": True,
        "message": "Thank you! Your feedback helps future students.",
        "feedback": result.data[0],
    }


@router.get("/center/{exam_id}")
async def get_center_feedback(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Returns all crowd sourced feedback for the exam center
    linked to a given exam. Shows insights to students.
    """
    user_id = user["sub"]

    exam = supabase.table("exams").select(
        "center_address, center_name, center_city"
    ).eq("id", exam_id).eq("user_id", user_id).single().execute()

    if not exam.data:
        raise NotFoundException("Exam not found.")

    feedback = supabase.table("exam_center_feedback").select("*").eq(
        "center_address", exam.data["center_address"]
    ).execute()

    return {
        "success": True,
        "center_name": exam.data["center_name"],
        "total_reviews": len(feedback.data),
        "feedback": feedback.data,
    }


@router.get("/my/{exam_id}")
async def get_my_feedback(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Returns the logged in student's own feedback for an exam.
    Used to check if student already submitted feedback.
    """
    user_id = user["sub"]

    feedback = supabase.table("exam_center_feedback").select("*").eq(
        "exam_id", exam_id
    ).eq("user_id", user_id).execute()

    return {
        "success": True,
        "already_submitted": len(feedback.data) > 0,
        "feedback": feedback.data[0] if feedback.data else None,
    }