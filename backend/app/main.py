from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi

from app.config import settings
from app.core.logger import setup_logger
from app.core.exceptions import ExamPilotException

logger = setup_logger(__name__)


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