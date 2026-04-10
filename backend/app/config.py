from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ExamPilot"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Gemini AI
    GEMINI_API_KEY: str

    # Google Maps
    GOOGLE_MAPS_API_KEY: str

    # Rate Limiting (Gemini API)
    FREE_TIER_DAILY_PARSE_LIMIT: int = 3
    PREMIUM_TIER_DAILY_PARSE_LIMIT: int = 20

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()