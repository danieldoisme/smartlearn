from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
from urllib.parse import quote_plus


class Settings(BaseSettings):
    AI_SERVER_URL: str
    AI_API_KEY: str
    AI_PARSER_MODEL: str = "qwen"
    AI_PARSER_TIMEOUT_SECONDS: float = 90.0
    AI_PARSER_MAX_CHARS: int = 48000
    AI_PARSER_MAX_INPUT_TOKENS: int = 8500
    AI_PARSER_MAX_TOKENS: int = 4000
    AI_PARSER_MIN_CONFIDENCE: float = 0.45

    DB_HOST: str
    DB_PORT: int = 3306
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    DATABASE_URL: Optional[str] = None

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: str = "http://localhost:5173"

    FRONTEND_BASE_URL: str = "http://localhost:5173"

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 465
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "SmartLearn <onboarding@resend.dev>"
    SMTP_USE_SSL: bool = True
    RESET_TOKEN_TTL_MINUTES: int = 30

    APP_NAME: str = "SmartLearn AI"
    DEBUG: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def get_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"mysql+aiomysql://{quote_plus(self.DB_USER)}:{quote_plus(self.DB_PASSWORD)}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
