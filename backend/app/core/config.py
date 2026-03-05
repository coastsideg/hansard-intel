from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost/hansard"
    ANTHROPIC_API_KEY: str = ""
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 168
    ENVIRONMENT: str = "development"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "hansard2024"
    SCRAPE_DELAY_SECONDS: float = 1.5
    MAX_CONCURRENT_DOWNLOADS: int = 3
    AI_BATCH_SIZE: int = 10
    AI_MODEL: str = "claude-sonnet-4-20250514"
    PDF_STORAGE_PATH: str = "/data/pdfs"

    class Config:
        env_file = ".env"

settings = Settings()
