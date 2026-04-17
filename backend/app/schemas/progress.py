from typing import Optional

from backend.app.schemas.base import CamelModel


class WeeklyPoint(CamelModel):
    day: str
    questions: int
    correct: int


class AccuracyPoint(CamelModel):
    week: str
    accuracy: int


class DocumentProgress(CamelModel):
    id: int
    title: str
    chapter_count: int
    chapters_completed: int
    question_count: int
    answered_count: int
    accuracy: int
    last_studied: Optional[str] = None
