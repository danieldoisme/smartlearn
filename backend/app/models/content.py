from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database import Base
from backend.app.models.enums import FileType

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.quiz import Question, StudySession
    from backend.app.models.interaction import Bookmark


def _enum_values(enum_cls):
    return [m.value for m in enum_cls]


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="topics")
    documents: Mapped[List["Document"]] = relationship(back_populates="topic")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    topic_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("topics.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[FileType] = mapped_column(
        SAEnum(FileType, values_callable=_enum_values), nullable=False
    )
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="documents")
    topic: Mapped[Optional["Topic"]] = relationship(back_populates="documents")
    chapters: Mapped[List["Chapter"]] = relationship(back_populates="document")


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documents.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content_text: Mapped[str] = mapped_column(LONGTEXT, nullable=False)
    page_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="chapters")
    questions: Mapped[List["Question"]] = relationship(back_populates="chapter")
    study_sessions: Mapped[List["StudySession"]] = relationship(
        back_populates="chapter"
    )
    bookmarks: Mapped[List["Bookmark"]] = relationship(back_populates="chapter")
