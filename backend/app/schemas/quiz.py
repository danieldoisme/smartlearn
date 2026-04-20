from datetime import datetime
from typing import Dict, List, Optional

from pydantic import Field

from backend.app.models.enums import QuestionType, SessionType
from backend.app.schemas.base import CamelModel


class QuestionOptionOut(CamelModel):
    id: int
    label: str
    content: str


class QuestionGenerationIn(CamelModel):
    question_type: str = Field(pattern="^(mcq|multi|fill|mixed)$")
    count: int = Field(default=10, ge=1, le=50)


class QuestionGenerationOut(CamelModel):
    chapter_id: int
    requested_count: int
    created_count: int
    skipped_count: int = 0
    warnings: List[str] = Field(default_factory=list)
    provider: str = "fallback"
    used_fallback: bool = False


class QuestionOut(CamelModel):
    id: int
    chapter_id: int
    question_type: QuestionType
    content: str
    chapter_title: Optional[str] = None
    document_id: Optional[int] = None
    document_title: Optional[str] = None
    source_text: Optional[str] = None
    source_context: Optional[str] = None
    source_page: Optional[int] = None
    options: List[QuestionOptionOut] = []


class StudySessionStart(CamelModel):
    chapter_id: int
    session_type: SessionType = SessionType.LEARN
    question_limit: Optional[int] = Field(default=None, ge=1, le=100)
    question_ids: List[int] = Field(default_factory=list)


class StudySessionStartOut(CamelModel):
    session_id: int
    chapter_id: int
    session_type: SessionType
    questions: List[QuestionOut]


class AvailableStudyChapterOut(CamelModel):
    chapter_id: int
    chapter_title: str
    document_id: int
    document_title: str
    question_count: int
    answered_count: int = 0
    progress: int = 0


class StudyAnswerIn(CamelModel):
    question_id: int
    selected_answer: Optional[str] = None
    is_skipped: bool = False


class StudyAnswerOut(CamelModel):
    question_id: int
    is_correct: bool
    is_skipped: bool
    correct_answer: Optional[str] = None
    correct_label: Optional[str] = None


class StudySessionCompleteOut(CamelModel):
    session_id: int
    total_questions: int
    correct_count: int
    completed_at: datetime


class ExamStart(CamelModel):
    chapter_id: Optional[int] = None
    chapter_ids: List[int] = Field(default_factory=list)
    question_type: Optional[QuestionType] = None
    question_limit: int = Field(default=10, ge=1, le=100)
    time_limit_minutes: int = Field(default=30, ge=1, le=240)
    allow_partial: bool = False


class ExamStartOut(CamelModel):
    exam_id: int
    time_limit_minutes: int
    total_questions: int
    started_at: datetime
    questions: List[QuestionOut]


class ExamSubmit(CamelModel):
    answers: Dict[int, Optional[str]] = Field(default_factory=dict)


class ExamProgressIn(CamelModel):
    answers: Dict[int, Optional[str]] = Field(default_factory=dict)
    is_paused: bool = False


class ExamSessionOut(CamelModel):
    exam_id: int
    time_limit_minutes: int
    total_questions: int
    started_at: datetime
    is_paused: bool
    questions: List[QuestionOut]
    answers: Dict[int, Optional[str]] = Field(default_factory=dict)


class ExamResultItem(CamelModel):
    question_id: int
    order_index: int
    content: str
    question_type: QuestionType
    chapter_id: Optional[int] = None
    chapter_title: Optional[str] = None
    document_id: Optional[int] = None
    document_title: Optional[str] = None
    selected_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    is_correct: bool
    is_skipped: bool
    source_text: Optional[str] = None
    source_context: Optional[str] = None
    source_page: Optional[int] = None


class ExamResultOut(CamelModel):
    exam_id: int
    score: float
    correct_count: int
    wrong_count: int
    skipped_count: int
    total_questions: int
    time_limit_minutes: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    results: List[ExamResultItem]
