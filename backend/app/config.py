from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
from urllib.parse import quote_plus


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-pro"

    AI_PARSER_TIMEOUT_SECONDS: float = 180.0
    AI_PARSER_MAX_CHARS: int = 48000
    AI_PARSER_MAX_INPUT_TOKENS: int = 8500
    AI_PARSER_MAX_TOKENS: int = 4000
    AI_PARSER_MIN_CONFIDENCE: float = 0.45
    # When ON, long documents are compressed to heading candidates so the whole
    # document fits the parser budget in one call (no silent tail truncation).
    # Falls back to windowed multi-call inference when even the compressed
    # payload overflows the budget. Set OFF to restore the legacy clip behavior.
    AI_PARSER_LONGDOC_MODE: bool = True
    # Number of context lines kept around each heading candidate to preserve
    # boundary-inference recall.
    AI_PARSER_CANDIDATE_CONTEXT_LINES: int = 2

    AQG_TIMEOUT_SECONDS: float = 240.0
    AQG_MAX_TOKENS: int = 8192
    AQG_TOKENS_PER_QUESTION: int = 384
    AQG_MAX_TOKENS_CEILING: int = 24576
    AQG_THINKING_BUDGET: int = 2048
    AQG_MAX_PASSAGES: int = 18

    DB_HOST: str = "localhost"
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
