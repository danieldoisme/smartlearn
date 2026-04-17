from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
from urllib.parse import quote_plus


class Settings(BaseSettings):
    AI_SERVER_URL: str
    AI_API_KEY: str

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
