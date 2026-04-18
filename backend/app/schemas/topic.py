from datetime import datetime

from pydantic import Field

from backend.app.schemas.base import CamelModel


class TopicOut(CamelModel):
    id: int
    user_id: int
    name: str
    created_at: datetime


class TopicCreate(CamelModel):
    name: str = Field(min_length=1, max_length=100)
