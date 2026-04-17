from datetime import datetime
from typing import Optional

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
