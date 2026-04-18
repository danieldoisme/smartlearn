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


class QuestionAttemptDetail(CamelModel):
    question_id: int
    content: str
    selected_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    is_correct: bool
    is_skipped: bool
    attempt_count: int
    last_answered_at: Optional[str] = None


class ChapterProgressDetail(CamelModel):
    chapter_id: int
    chapter_title: str
    accuracy: int
    answered_count: int
    question_count: int
    questions: list[QuestionAttemptDetail] = []


class DocumentProgressDetail(CamelModel):
    document_id: int
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    answered_count: int
    accuracy: int
    chapters: list[ChapterProgressDetail] = []
