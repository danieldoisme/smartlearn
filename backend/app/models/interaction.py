from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database import Base

class Bookmark(Base):
    __tablename__ = "bookmarks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    question_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("questions.id"), nullable=True)
    chapter_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("chapters.id"), nullable=True)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="bookmarks")
    question: Mapped[Optional["Question"]] = relationship(back_populates="bookmarks")
    chapter: Mapped[Optional["Chapter"]] = relationship(back_populates="bookmarks")
    notes: Mapped[List["Note"]] = relationship(back_populates="bookmark")

class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    bookmark_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("bookmarks.id"), nullable=True)
    question_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("questions.id"), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="notes")
    bookmark: Mapped[Optional["Bookmark"]] = relationship(back_populates="notes")
    question: Mapped[Optional["Question"]] = relationship(back_populates="notes")
