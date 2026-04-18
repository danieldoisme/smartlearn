from datetime import datetime
from typing import List, Optional

from backend.app.models.enums import QuestionType
from backend.app.schemas.base import CamelModel


class ReviewQuestion(CamelModel):
    id: int
    content: str
    question_type: QuestionType
    answer_format: str
    selected_answer_value: Optional[str] = None
    selected_answer_display: Optional[str] = None
    correct_answer_value: Optional[str] = None
    correct_answer_display: Optional[str] = None
    attempt_count: int
    last_answered_at: datetime


class ReviewChapter(CamelModel):
    chapter_id: int
    title: str
    questions: List[ReviewQuestion]


class ReviewDocument(CamelModel):
    document_title: str
    chapters: List[ReviewChapter]
