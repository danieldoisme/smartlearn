from datetime import datetime

from backend.app.schemas.base import CamelModel


class TopicOut(CamelModel):
    id: int
    user_id: int
    name: str
    created_at: datetime
