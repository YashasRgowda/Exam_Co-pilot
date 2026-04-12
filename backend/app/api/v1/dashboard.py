from fastapi import APIRouter, Depends
from app.db.database import supabase
from app.core.logger import setup_logger
from app.core.exceptions import NotFoundException
from app.dependencies import get_current_user
from datetime import date

router = APIRouter()
logger = setup_logger(__name__)


@router.get("/")
async def get_dashboard(user: dict = Depends(get_current_user)):
    """
    Returns student's full dashboard data.
    Shows upcoming exams sorted by date.
    """
    user_id = user["sub"]
    today = date.today().isoformat()

    # Get all upcoming exams
    upcoming = supabase.table("exams").select("*").eq(
        "user_id", user_id
    ).gte("exam_date", today).order(
        "exam_date", desc=False
    ).execute()

    # Get past exams
    past = supabase.table("exams").select("*").eq(
        "user_id", user_id
    ).lt("exam_date", today).order(
        "exam_date", desc=True
    ).limit(5).execute()

    # Get profile
    profile = supabase.table("profiles").select(
        "full_name, is_premium, phone"
    ).eq("id", user_id).single().execute()

    return {
        "success": True,
        "profile": profile.data,
        "upcoming_exams": upcoming.data,
        "past_exams": past.data,
        "upcoming_count": len(upcoming.data),
    }


@router.get("/exam/{exam_id}")
async def get_exam_dashboard(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Returns complete dashboard for a single exam.
    Includes exam details + checklist + notifications.
    This is the main screen students see after parsing.
    """
    user_id = user["sub"]

    # Get exam details
    exam = supabase.table("exams").select("*").eq(
        "id", exam_id
    ).eq("user_id", user_id).single().execute()

    if not exam.data:
        raise NotFoundException("Exam not found.")

    # Get checklist for this exam
    checklist = supabase.table("checklist_items").select("*").eq(
        "exam_id", exam_id
    ).eq("user_id", user_id).execute()

    # Get notifications for this exam
    notifications = supabase.table("notifications").select("*").eq(
        "exam_id", exam_id
    ).eq("user_id", user_id).execute()

    # Calculate days remaining
    exam_date = date.fromisoformat(exam.data["exam_date"])
    today = date.today()
    days_remaining = (exam_date - today).days

    return {
        "success": True,
        "exam": exam.data,
        "days_remaining": days_remaining,
        "checklist": checklist.data,
        "checklist_total": len(checklist.data),
        "checklist_done": len([i for i in checklist.data if i["is_checked"]]),
        "notifications": notifications.data,
    }