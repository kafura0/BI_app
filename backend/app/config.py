from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")

    # Application
    APP_NAME: str = "BI SaaS Platform"
    APP_URL: str = "http://localhost:3000"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v: object) -> bool:
        if v == "" or v is None:
            return False
        return bool(v)

    # Security
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_min_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    # Database
    DATABASE_URL: str
    SYNC_DATABASE_URL: str = ""

    # OpenAI (optional — missing key disables AI features)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_MAX_TOKENS: int = 2048

    # Rate limiting
    RATELIMIT_ENABLED: bool = True

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 50
    UPLOAD_DIR: str = "/tmp/bi_uploads"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS — comma-separated string so pydantic_settings doesn't try to JSON-parse it
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRO_PRICE_ID: str = ""
    STRIPE_ENTERPRISE_PRICE_ID: str = ""
    STRIPE_SUCCESS_URL: str = "http://localhost:3000/billing?success=1"
    STRIPE_CANCEL_URL: str = "http://localhost:3000/billing?canceled=1"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "BI Platform"
    SMTP_FROM_EMAIL: str = "noreply@yourdomain.com"
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    INVITE_TOKEN_EXPIRE_HOURS: int = 72

    # Plan limits
    FREE_PLAN_MAX_DATASETS: int = 5
    FREE_PLAN_MAX_ROWS: int = 10_000
    FREE_PLAN_MAX_QUERIES_PER_DAY: int = 20
    PRO_PLAN_MAX_DATASETS: int = 50
    PRO_PLAN_MAX_ROWS: int = 500_000
    PRO_PLAN_MAX_QUERIES_PER_DAY: int = 500

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def emails_enabled(self) -> bool:
        return bool(self.SMTP_USERNAME and self.SMTP_PASSWORD)

    @property
    def stripe_enabled(self) -> bool:
        return bool(self.STRIPE_SECRET_KEY)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
