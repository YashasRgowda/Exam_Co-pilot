# ─────────────────────────────────────────────────────────────
# dashboard.py
# Dashboard API — returns exam data for home screen and exam detail
#
# Two endpoints:
# GET /dashboard/           → home screen data (all upcoming + past exams)
# GET /dashboard/exam/{id}  → single exam full detail screen data
#
# Key logic: compute_next_session()
# Given all sessions of an exam, finds which session to highlight:
# 1. Session happening RIGHT NOW (start <= now <= end)
# 2. Next upcoming session (start > now)
# 3. All sessions past → return last session
# ─────────────────────────────────────────────────────────────

from fastapi import APIRouter, Depends
from app.db.database import supabase_admin
from app.core.logger import setup_logger
from app.core.exceptions import NotFoundException
from app.dependencies import get_current_user
from datetime import date, datetime, time as dt_time, timezone, timedelta

router = APIRouter()
logger = setup_logger(__name__)


# ─────────────────────────────────────────────────────────────
# TIMEZONE HELPER
# All session times in DB are in IST (India Standard Time)
# UTC+5:30 — we must use IST for correct session comparison
# Using datetime.now() without timezone = Mac local time = wrong
# ─────────────────────────────────────────────────────────────

IST = timezone(timedelta(hours=5, minutes=30))


def get_now_ist() -> datetime:
    """
    Returns current datetime in IST as a naive datetime object.
    Naive = no timezone info, for direct comparison with session times.
    """
    return datetime.now(IST).replace(tzinfo=None)


# ─────────────────────────────────────────────────────────────
# SESSION DATETIME HELPERS
# Convert DB session row → Python datetime for comparison
# DB stores exam_date as "2026-04-27" and start_time as "10:30:00"
# We combine them into a single datetime like "2026-04-27 10:30:00"
# ─────────────────────────────────────────────────────────────

def session_start_datetime(session: dict) -> datetime:
    """
    Returns the start datetime of a session.
    Falls back to datetime.max if data is missing or invalid
    so it's safely treated as 'very far future' in comparisons.
    """
    try:
        d = date.fromisoformat(session["exam_date"])
        parts = (session.get("start_time") or "00:00").split(":")
        t = dt_time(int(parts[0]), int(parts[1]))
        return datetime.combine(d, t)
    except Exception:
        return datetime.max


def session_end_datetime(session: dict) -> datetime:
    """
    Returns the end datetime of a session.
    Falls back to datetime.max if data is missing or invalid.
    """
    try:
        d = date.fromisoformat(session["exam_date"])
        end = session.get("end_time") or "23:59"
        parts = end.split(":")
        t = dt_time(int(parts[0]), int(parts[1]))
        return datetime.combine(d, t)
    except Exception:
        return datetime.max


# ─────────────────────────────────────────────────────────────
# CORE LOGIC: compute_next_session
# This is the most important function in this file.
# It determines which session to show in the hero card.
#
# Priority order:
# 1. Currently happening → student is in exam right now
# 2. Next upcoming → exam hasn't started yet
# 3. All past → all sessions done, show last session
# ─────────────────────────────────────────────────────────────

def compute_next_session(sessions: list, now: datetime) -> dict | None:
    """
    Given a list of session dicts and current IST datetime,
    returns the session that should be highlighted to the student.
    Returns None if sessions list is empty.
    """
    if not sessions:
        return None

    # ── PRIORITY 1: Currently happening ──
    # Check if student is IN an exam right now
    # If yes, show that session immediately
    for session in sessions:
        start = session_start_datetime(session)
        end = session_end_datetime(session)
        if start <= now <= end:
            logger.info(
                f"Session happening now: {session.get('subject_name')} "
                f"{session.get('start_time')} → {session.get('end_time')}"
            )
            return session

    # ── PRIORITY 2: Next upcoming ──
    # Filter sessions that haven't started yet
    # Pick the earliest one
    upcoming = [
        s for s in sessions
        if session_start_datetime(s) > now
    ]
    if upcoming:
        next_s = min(upcoming, key=lambda s: session_start_datetime(s))
        logger.info(
            f"Next upcoming session: {next_s.get('subject_name')} "
            f"on {next_s.get('exam_date')} at {next_s.get('start_time')}"
        )
        return next_s

    # ── PRIORITY 3: All sessions past ──
    # Exam is completely over — return last session
    # This shows on home screen until student deletes the exam
    logger.info("All sessions past — returning last session")
    return sessions[-1]


# ─────────────────────────────────────────────────────────────
# HELPER: compute days remaining
# Based on next session date, not exam_date
# exam_date on exams table = first session date (for DB sorting only)
# Real "days left" = days to next session
# ─────────────────────────────────────────────────────────────

def compute_days_remaining(next_session: dict | None, exam: dict, today: date) -> int | None:
    """
    Returns how many days until the next session.
    If next_session exists → use its exam_date
    Otherwise → fall back to exam.exam_date
    Returns None if dates are invalid.
    """
    # Try next session date first
    if next_session and next_session.get("exam_date"):
        try:
            next_date = date.fromisoformat(next_session["exam_date"])
            return (next_date - today).days
        except Exception:
            pass

    # Fall back to exam_date
    if exam.get("exam_date"):
        try:
            exam_date = date.fromisoformat(exam["exam_date"])
            return (exam_date - today).days
        except Exception:
            pass

    return None


# ─────────────────────────────────────────────────────────────
# ENDPOINT 1: GET /dashboard/
# Home screen data
# Returns all upcoming + past exams with sessions and next_session
# Called every time home screen loads or refreshes
# ─────────────────────────────────────────────────────────────

@router.get("/")
async def get_dashboard(user: dict = Depends(get_current_user)):
    """
    Returns full dashboard data for the home screen.
    Each upcoming exam includes:
    - sessions: all exam sessions
    - next_session: which session to highlight (computed by IST)
    - days_remaining: days to next session
    """
    user_id = user["sub"]

    # Get current IST time — critical for correct session comparison
    now = get_now_ist()
    today = now.date()
    today_str = today.isoformat()

    logger.info(f"Dashboard fetched at IST: {now.strftime('%Y-%m-%d %H:%M:%S')}")

    # ── Fetch upcoming exams ──
    # Exams where exam_date >= today (first session date)
    upcoming_result = supabase_admin.table("exams").select("*").eq(
        "user_id", user_id
    ).gte("exam_date", today_str).order("exam_date", desc=False).execute()

    # ── Fetch recent past exams ──
    # Limited to 5 — shown in "Past" section on home screen
    past_result = supabase_admin.table("exams").select("*").eq(
        "user_id", user_id
    ).lt("exam_date", today_str).order("exam_date", desc=True).limit(5).execute()

    # ── Fetch user profile ──
    profile_result = supabase_admin.table("profiles").select(
        "full_name, is_premium, phone"
    ).eq("id", user_id).execute()
    profile = profile_result.data[0] if profile_result.data else {}

    # ── Build upcoming exams with session data ──
    upcoming_with_sessions = []

    for exam in upcoming_result.data:
        # Fetch all sessions for this exam, ordered by session number
        sessions_result = supabase_admin.table("exam_sessions").select("*").eq(
            "exam_id", exam["id"]
        ).order("session_number", desc=False).execute()

        sessions = sessions_result.data or []

        # Compute which session to highlight
        next_session = compute_next_session(sessions, now)

        # Compute days remaining based on next session
        days_remaining = compute_days_remaining(next_session, exam, today)

        upcoming_with_sessions.append({
            **exam,
            "days_remaining": days_remaining,
            "sessions": sessions,
            "next_session": next_session,
        })

    logger.info(
        f"Dashboard: {len(upcoming_with_sessions)} upcoming, "
        f"{len(past_result.data)} past exams for user {user_id}"
    )

    return {
        "success": True,
        "profile": profile,
        "upcoming_exams": upcoming_with_sessions,
        "past_exams": past_result.data,
        "upcoming_count": len(upcoming_with_sessions),
    }


# ─────────────────────────────────────────────────────────────
# ENDPOINT 2: GET /dashboard/exam/{exam_id}
# Single exam detail screen data
# Returns exam + all sessions + checklist + notifications
# Called when student opens an exam detail screen
# Also called every 60 seconds by the auto-refresh interval
# ─────────────────────────────────────────────────────────────

@router.get("/exam/{exam_id}")
async def get_exam_dashboard(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Returns complete data for a single exam detail screen.
    Includes sessions with next_session computed in IST.
    Includes checklist items and notifications.
    """
    user_id = user["sub"]

    # Get current IST time
    now = get_now_ist()
    today = now.date()

    logger.info(
        f"Exam dashboard {exam_id} fetched at IST: "
        f"{now.strftime('%Y-%m-%d %H:%M:%S')}"
    )

    # ── Fetch exam ──
    exam_result = supabase_admin.table("exams").select("*").eq(
        "id", exam_id
    ).eq("user_id", user_id).execute()

    if not exam_result.data:
        raise NotFoundException("Exam not found.")

    exam = exam_result.data[0]

    # ── Fetch all sessions for this exam ──
    sessions_result = supabase_admin.table("exam_sessions").select("*").eq(
        "exam_id", exam_id
    ).order("session_number", desc=False).execute()

    sessions = sessions_result.data or []

    # Compute which session to highlight
    next_session = compute_next_session(sessions, now)

    # Compute days remaining
    days_remaining = compute_days_remaining(next_session, exam, today)

    # ── Fetch checklist items ──
    checklist_result = supabase_admin.table("checklist_items").select("*").eq(
        "exam_id", exam_id
    ).eq("user_id", user_id).execute()

    checklist = checklist_result.data or []
    checklist_done = len([i for i in checklist if i["is_checked"]])

    # ── Fetch notifications ──
    notifications_result = supabase_admin.table("notifications").select("*").eq(
        "exam_id", exam_id
    ).eq("user_id", user_id).execute()

    logger.info(
        f"Exam {exam_id}: {len(sessions)} sessions, "
        f"next={next_session.get('subject_name') if next_session else 'none'}, "
        f"days={days_remaining}, checklist={checklist_done}/{len(checklist)}"
    )

    return {
        "success": True,
        "exam": exam,
        "sessions": sessions,
        "next_session": next_session,
        "days_remaining": days_remaining,
        "checklist": checklist,
        "checklist_total": len(checklist),
        "checklist_done": checklist_done,
        "notifications": notifications_result.data,
    }