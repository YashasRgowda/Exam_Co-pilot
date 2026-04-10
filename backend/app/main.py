from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.logger import setup_logger
from app.core.exceptions import ExamPilotException

logger = setup_logger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="Backend API for ExamPilot — Never miss your exam again.",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    # -------------------------
    # Middleware
    # -------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Tighten this in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -------------------------
    # Global Exception Handler
    # -------------------------
    @app.exception_handler(ExamPilotException)
    async def exampilot_exception_handler(
        request: Request, exc: ExamPilotException
    ):
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

    # -------------------------
    # Routers
    # -------------------------
    from app.api.v1 import auth, admit_card, dashboard, checklist, navigation, notifications, feedback, premium

    app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Auth"])
    app.include_router(admit_card.router, prefix=f"{settings.API_V1_PREFIX}/admit-card", tags=["Admit Card"])
    app.include_router(dashboard.router, prefix=f"{settings.API_V1_PREFIX}/dashboard", tags=["Dashboard"])
    app.include_router(checklist.router, prefix=f"{settings.API_V1_PREFIX}/checklist", tags=["Checklist"])
    app.include_router(navigation.router, prefix=f"{settings.API_V1_PREFIX}/navigation", tags=["Navigation"])
    app.include_router(notifications.router, prefix=f"{settings.API_V1_PREFIX}/notifications", tags=["Notifications"])
    app.include_router(feedback.router, prefix=f"{settings.API_V1_PREFIX}/feedback", tags=["Feedback"])
    app.include_router(premium.router, prefix=f"{settings.API_V1_PREFIX}/premium", tags=["Premium"])

    # -------------------------
    # Health Check
    # -------------------------
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "success": True,
            "app": settings.APP_NAME,
            "env": settings.APP_ENV,
            "status": "healthy",
        }

    logger.info(f"{settings.APP_NAME} started in {settings.APP_ENV} mode")

    return app


app = create_app()