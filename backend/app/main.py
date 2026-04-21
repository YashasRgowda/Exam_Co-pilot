from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi

from app.config import settings
from app.core.logger import setup_logger
from app.core.exceptions import ExamPilotException

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone

logger = setup_logger(__name__)

async def send_due_notifications():
    """
    Runs every minute.
    Checks DB for notifications due to be sent.
    Fires push notification via Expo Push API and marks as sent.
    """
    from app.db.database import supabase_admin
    from app.api.v1.notifications import send_expo_push
    import logging
    log = logging.getLogger("exampilot.scheduler")

    try:
        now = datetime.now(timezone.utc).isoformat()

        # Fetch all unsent notifications that are due
        due = supabase_admin.table("notifications").select(
            "id, expo_push_token, notification_type, exam_id"
        ).eq("is_sent", False).lte("scheduled_at", now).execute()

        if not due.data:
            return

        log.info(f"Found {len(due.data)} due notifications")

        for notif in due.data:
            # Get exam name for the notification message
            exam = supabase_admin.table("exams").select(
                "exam_name, exam_date, reporting_time"
            ).eq("id", notif["exam_id"]).single().execute()

            if not exam.data:
                continue

            exam_name = exam.data["exam_name"]
            reporting_time = exam.data.get("reporting_time", "")[:5] if exam.data.get("reporting_time") else ""

            # Build message based on notification type
            if notif["notification_type"] == "night_before":
                title = "Exam Tomorrow! 🎯"
                body = f"{exam_name} is tomorrow. Pack your bag and keep your admit card ready tonight."
            elif notif["notification_type"] == "morning_of":
                title = "Exam Day! ⏰"
                body = f"Today is your {exam_name}. Exam starts at {reporting_time}. Check your checklist and leave on time!"
            else:
                continue

            # Send push notification
            success = await send_expo_push(
                token=notif["expo_push_token"],
                title=title,
                body=body,
            )

            if success:
                # Mark as sent
                supabase_admin.table("notifications").update({
                    "is_sent": True,
                    "sent_at": now,
                }).eq("id", notif["id"]).execute()
                log.info(f"Notification sent and marked: {notif['id']}")

    except Exception as e:
        log.error(f"Scheduler error: {e}")

def create_app() -> FastAPI:

    # ---------------------------------------------------------------
    # FastAPI app initialization
    # docs_url is only available in development mode, hidden in prod
    # ---------------------------------------------------------------
    app = FastAPI(
        title=settings.APP_NAME,
        description="Backend API for ExamPilot — Never miss your exam again.",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    # ---------------------------------------------------------------
    # CORS Middleware
    # Allows the React Native frontend to talk to this backend
    # In production, replace "*" with your actual frontend domain
    # ---------------------------------------------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ---------------------------------------------------------------
    # Global Exception Handlers
    # ExamPilotException → our custom errors (400, 401, 404, 429)
    # Exception          → any unexpected error → 500
    # Both return consistent JSON: { success, error }
    # ---------------------------------------------------------------
    @app.exception_handler(ExamPilotException)
    async def exampilot_exception_handler(request: Request, exc: ExamPilotException):
        logger.error(f"ExamPilotException: {exc.detail} | Path: {request.url.path}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.detail,
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc} | Path: {request.url.path}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Something went wrong. Please try again.",
            },
        )

    # ---------------------------------------------------------------
    # Router Registration
    # All route logic lives in app/api/v1/*.py
    # Here we just register them with their URL prefix and tag
    # Tag is used for grouping in Swagger /docs UI
    # ---------------------------------------------------------------
    from app.api.v1 import (
        auth,
        admit_card,
        dashboard,
        checklist,
        navigation,
        notifications,
        feedback,
        premium,
    )

    app.include_router(auth.router,          prefix=f"{settings.API_V1_PREFIX}/auth",          tags=["Auth"])
    app.include_router(admit_card.router,    prefix=f"{settings.API_V1_PREFIX}/admit-card",    tags=["Admit Card"])
    app.include_router(dashboard.router,     prefix=f"{settings.API_V1_PREFIX}/dashboard",     tags=["Dashboard"])
    app.include_router(checklist.router,     prefix=f"{settings.API_V1_PREFIX}/checklist",     tags=["Checklist"])
    app.include_router(navigation.router,    prefix=f"{settings.API_V1_PREFIX}/navigation",    tags=["Navigation"])
    app.include_router(notifications.router, prefix=f"{settings.API_V1_PREFIX}/notifications", tags=["Notifications"])
    app.include_router(feedback.router,      prefix=f"{settings.API_V1_PREFIX}/feedback",      tags=["Feedback"])
    app.include_router(premium.router,       prefix=f"{settings.API_V1_PREFIX}/premium",       tags=["Premium"])
    
    # ---------------------------------------------------------------
    # Background Scheduler
    # Runs every minute to send due push notifications
    # ---------------------------------------------------------------
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        send_due_notifications,
        trigger="interval",
        minutes=1,
        id="notification_scheduler",
        replace_existing=True,
    )

    @app.on_event("startup")
    async def start_scheduler():
        scheduler.start()
        logger.info("Notification scheduler started")

    @app.on_event("shutdown")
    async def stop_scheduler():
        scheduler.shutdown()
        logger.info("Notification scheduler stopped")

    # ---------------------------------------------------------------
    # Health Check Endpoint
    # Used to verify the server is running
    # Render and other platforms ping this to check service health
    # ---------------------------------------------------------------
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "success": True,
            "app": settings.APP_NAME,
            "env": settings.APP_ENV,
            "status": "healthy",
        }

    # ---------------------------------------------------------------
    # Custom OpenAPI Schema
    # Adds BearerAuth security scheme to Swagger /docs UI
    # This gives us the green Authorize button in /docs
    # So we can test protected routes directly from the browser
    # ---------------------------------------------------------------
    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema

        openapi_schema = get_openapi(
            title=settings.APP_NAME,
            version="1.0.0",
            description="Backend API for ExamPilot — Never miss your exam again.",
            routes=app.routes,
        )
        openapi_schema["components"]["securitySchemes"] = {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
            }
        }
        for path in openapi_schema["paths"].values():
            for method in path.values():
                method["security"] = [{"BearerAuth": []}]

        app.openapi_schema = openapi_schema
        return app.openapi_schema

    app.openapi = custom_openapi

    logger.info(f"{settings.APP_NAME} started in {settings.APP_ENV} mode")

    return app


# ---------------------------------------------------------------
# App instance
# This is what uvicorn imports and serves
# run.py does: uvicorn.run("app.main:app", ...)
# ---------------------------------------------------------------
app = create_app()