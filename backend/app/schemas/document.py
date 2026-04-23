from datetime import datetime
from typing import Optional

from pydantic import Field

from backend.app.models.enums import FileType
from backend.app.schemas.base import CamelModel


class DocumentOut(CamelModel):
    id: int
    user_id: int
    topic_id: Optional[int] = None
    title: str
    file_path: str
    file_type: FileType
    file_size: int
    created_at: datetime
    updated_at: datetime


class ChapterStructureIn(CamelModel):
    title: str = Field(min_length=1, max_length=255)
    content_text: str = Field(default="")
    page_start: Optional[int] = None
    page_end: Optional[int] = None


class DocumentUploadIn(CamelModel):
    file_name: str = Field(min_length=1, max_length=255)
    file_content_base64: str = Field(min_length=1)
    title: Optional[str] = Field(default=None, max_length=255)
    topic_id: Optional[int] = None
    topic_name: Optional[str] = Field(default=None, max_length=100)
    chapters: Optional[list[ChapterStructureIn]] = None


class DocumentPreviewSection(CamelModel):
    title: str
    content_text: str
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    content_chars: int = 0


class DocumentPreviewOut(CamelModel):
    file_name: str
    file_type: FileType
    file_size: int
    title: str
    chapter_count: int
    total_chars: int
    sections: list[DocumentPreviewSection]
    parser_mode: str = "fallback"
    review_required: bool = False
    confidence: Optional[float] = None
    warnings: list[str] = Field(default_factory=list)


class DocumentUpdateIn(CamelModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    topic_id: Optional[int] = None


class LibraryDocumentOut(DocumentOut):
    topic_name: Optional[str] = None
    chapter_count: int = 0
    question_count: int = 0
    progress: int = 0


class ChapterOut(CamelModel):
    id: int
    document_id: int
    title: str
    order_index: int
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    content_text: Optional[str] = None


class ChapterWithStats(ChapterOut):
    question_count: int = 0
    answered_count: int = 0
    correct_count: int = 0
    accuracy: int = 0


class DocumentDetailOut(LibraryDocumentOut):
    chapters: list[ChapterWithStats] = []
    total_questions: int = 0
    total_answered: int = 0


class DocumentStructureUpdateIn(CamelModel):
    chapters: list[ChapterStructureIn] = Field(min_length=1, max_length=1000)
    force_delete_questions: bool = False

