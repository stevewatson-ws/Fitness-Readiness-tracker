"""Application configuration loaded from environment variables."""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME:    str  = "Fitness Intelligence"
    APP_VERSION: str  = "1.0.0"
    DEBUG:       bool = False

    # Security
    SECRET_KEY:              str  = "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION"
    ALGORITHM:               str  = "HS256"
    ACCESS_TOKEN_EXPIRE_MINS: int = 1440  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./fitness_intelligence.db"
    DB_ECHO:      bool = False

    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Demo mode
    DEMO_MODE: bool = True

    model_config = {"env_file": ".env", "case_sensitive": True}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
