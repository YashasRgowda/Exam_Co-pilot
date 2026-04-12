from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.db.database import supabase, supabase_admin
from app.core.logger import setup_logger
from app.core.exceptions import NotFoundException, InternalServerException
from app.dependencies import get_current_user
from datetime import datetime, date, timedelta
import httpx

router = APIRouter()
logger = setup_logger(__name__)


# ---------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------
class RegisterTokenRequest(BaseModel):
    expo_push_token: str
    exam_id: str


# ---------------------------------------------------------------
# Helper: Send Expo Push Notification
# ---------------------------------------------------------------
async def send_expo_push(token: str, title: str, body: str) -> bool:
    """
    Sends a push notification via Expo Push API.
    Free, no account needed, works directly with Expo tokens.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json={
                    "to": token,
                    "title": title,
                    "body": body,
                    "sound": "default",
                    "priority": "high",
                },
                headers={"Content-Type": "application/json"},
            )
        logger.info(f"Push notification sent: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Push notification failed: {e}")
        return False


# ---------------------------------------------------------------
# Routes
# ---------------------------------------------------------------

@router.post("/register")
async def register_push_token(
    payload: RegisterTokenRequest,
    user: dict = Depends(get_current_user)
):
    """
    Registers student's Expo push token for an exam.
    Schedules night before and morning of exam reminders.
    Called after exam is parsed and student allows notifications.
    """
    user_id = user["sub"]

    # Verify exam belongs to user
    exam = supabase.table("exams").select(
        "id, exam_name, exam_date, reporting_time"
    ).eq("id", payload.exam_id).eq("user_id", user_id).single().execute()

    if not exam.data:
        raise NotFoundException("Exam not found.")

    exam_data = exam.data
    exam_date = date.fromisoformat(exam_data["exam_date"])

    # Night before reminder → 9 PM the evening before exam
    night_before = datetime.combine(
        exam_date - timedelta(days=1),
        datetime.strptime("21:00", "%H:%M").time()
    )

    # Morning of exam reminder → 6 AM on exam day
    morning_of = datetime.combine(
        exam_date,
        datetime.strptime("06:00", "%H:%M").time()
    )

    # Delete existing notifications for this exam
    supabase_admin.table("notifications").delete().eq(
        "exam_id", payload.exam_id
    ).execute()

    # Insert scheduled notifications
    notifications = [
        {
            "user_id": user_id,
            "exam_id": payload.exam_id,
            "expo_push_token": payload.expo_push_token,
            "notification_type": "night_before",
            "scheduled_at": night_before.isoformat(),
            "is_sent": False,
        },
        {
            "user_id": user_id,
            "exam_id": payload.exam_id,
            "expo_push_token": payload.expo_push_token,
            "notification_type": "morning_of",
            "scheduled_at": morning_of.isoformat(),
            "is_sent": False,
        },
    ]

    result = supabase_admin.table("notifications").insert(notifications).execute()

    logger.info(f"Notifications scheduled for exam {payload.exam_id}")

    return {
        "success": True,
        "message": "Reminders scheduled successfully.",
        "reminders": [
            {
                "type": "night_before",
                "scheduled_at": night_before.isoformat(),
            },
            {
                "type": "morning_of",
                "scheduled_at": morning_of.isoformat(),
            },
        ],
    }


@router.post("/send-test")
async def send_test_notification(
    payload: RegisterTokenRequest,
    user: dict = Depends(get_current_user)
):
    """
    Sends a test push notification immediately.
    Used to verify push token is working correctly.
    """
    success = await send_expo_push(
        token=payload.expo_push_token,
        title="ExamPilot 🎯",
        body="Test notification working! You're all set for your exam.",
    )

    return {
        "success": success,
        "message": "Test notification sent." if success else "Failed to send notification.",
    }


@router.get("/{exam_id}")
async def get_notifications(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Returns all scheduled notifications for an exam.
    """
    user_id = user["sub"]

    notifications = supabase.table("notifications").select("*").eq(
        "exam_id", exam_id
    ).eq("user_id", user_id).execute()

    return {
        "success": True,
        "notifications": notifications.data,
    }