from fastapi import APIRouter, Depends
from app.db.database import supabase, supabase_admin
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
    upcoming = supabase_admin.table("exams").select("*").eq(
        "user_id", user_id
    ).gte("exam_date", today).order(
        "exam_date", desc=False
    ).execute()

    # Get past exams
    past = supabase_admin.table("exams").select("*").eq(
        "user_id", user_id
    ).lt("exam_date", today).order(
        "exam_date", desc=True
    ).limit(5).execute()

    # Get profile — use execute without single() to avoid crash
    profile_result = supabase_admin.table("profiles").select(
        "full_name, is_premium, phone"
    ).eq("id", user_id).execute()

    profile = profile_result.data[0] if profile_result.data else {}

    # Add days_remaining to each upcoming exam
    upcoming_with_days = []
    for exam in upcoming.data:
        try:
            exam_date = date.fromisoformat(exam["exam_date"])
            days_remaining = (exam_date - date.today()).days
            upcoming_with_days.append({**exam, "days_remaining": days_remaining})
        except Exception:
            upcoming_with_days.append({**exam, "days_remaining": None})

    return {
        "success": True,
        "profile": profile,
        "upcoming_exams": upcoming_with_days,
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
    """
    user_id = user["sub"]

    # Get exam details — no .single() to avoid crash on 0 rows
    exam_result = supabase_admin.table("exams").select("*").eq(
        "id", exam_id
    ).eq("user_id", user_id).execute()

    if not exam_result.data:
        raise NotFoundException("Exam not found.")

    exam = exam_result.data[0]

    # Get checklist for this exam
    checklist = supabase_admin.table("checklist_items").select("*").eq(
        "exam_id", exam_id
    ).eq("user_id", user_id).execute()

    # Get notifications for this exam
    notifications = supabase_admin.table("notifications").select("*").eq(
        "exam_id", exam_id
    ).eq("user_id", user_id).execute()

    # Calculate days remaining
    days_remaining = None
    try:
        exam_date = date.fromisoformat(exam["exam_date"])
        days_remaining = (exam_date - date.today()).days
    except Exception:
        pass

    return {
        "success": True,
        "exam": exam,
        "days_remaining": days_remaining,
        "checklist": checklist.data,
        "checklist_total": len(checklist.data),
        "checklist_done": len([i for i in checklist.data if i["is_checked"]]),
        "notifications": notifications.data,
    }