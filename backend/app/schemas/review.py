from datetime import datetime
from typing import List, Optional

from backend.app.models.enums import QuestionType
from backend.app.schemas.base import CamelModel


class ReviewQuestion(CamelModel):
    id: int
    content: str
    question_type: QuestionType
    selected_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    attempt_count: int
    last_answered_at: datetime


class ReviewChapter(CamelModel):
    chapter_id: int
    title: str
    questions: List[ReviewQuestion]


class ReviewDocument(CamelModel):
    document_title: str
    chapters: List[ReviewChapter]
