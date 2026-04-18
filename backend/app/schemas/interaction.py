from datetime import datetime
from typing import Optional

from pydantic import Field

from backend.app.schemas.base import CamelModel


class BookmarkOut(CamelModel):
    id: int
    user_id: int
    question_id: Optional[int] = None
    chapter_id: Optional[int] = None
    page_number: Optional[int] = None
    created_at: datetime
    # Enriched context
    question_content: Optional[str] = None
    chapter_title: Optional[str] = None
    document_id: Optional[int] = None
    document_title: Optional[str] = None


class BookmarkCreate(CamelModel):
    question_id: Optional[int] = None
    chapter_id: Optional[int] = None
    page_number: Optional[int] = None


class NoteOut(CamelModel):
    id: int
    user_id: int
    bookmark_id: Optional[int] = None
    question_id: Optional[int] = None
    content: str
    created_at: datetime
    updated_at: datetime
    # Enriched context
    question_content: Optional[str] = None
    page_number: Optional[int] = None
    chapter_id: Optional[int] = None
    chapter_title: Optional[str] = None
    document_id: Optional[int] = None
    document_title: Optional[str] = None


class NoteCreate(CamelModel):
    bookmark_id: Optional[int] = None
    question_id: Optional[int] = None
    content: str = Field(min_length=1)


class NoteUpdate(CamelModel):
    content: str = Field(min_length=1)
