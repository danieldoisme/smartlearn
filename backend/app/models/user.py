from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database import Base
from backend.app.models.enums import QuestionType, DisplayMode

if TYPE_CHECKING:
    from backend.app.models.content import Topic, Document
    from backend.app.models.quiz import StudySession, UserAnswer, Exam
    from backend.app.models.interaction import Bookmark, Note


def _enum_values(enum_cls):
    return [m.value for m in enum_cls]


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    preferences: Mapped["UserPreference"] = relationship(
        back_populates="user", uselist=False
    )
    topics: Mapped[List["Topic"]] = relationship(back_populates="user")
    documents: Mapped[List["Document"]] = relationship(back_populates="user")
    study_sessions: Mapped[List["StudySession"]] = relationship(back_populates="user")
    user_answers: Mapped[List["UserAnswer"]] = relationship(back_populates="user")
    exams: Mapped[List["Exam"]] = relationship(back_populates="user")
    bookmarks: Mapped[List["Bookmark"]] = relationship(back_populates="user")
    notes: Mapped[List["Note"]] = relationship(back_populates="user")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), unique=True, nullable=False
    )
    default_question_count: Mapped[int] = mapped_column(Integer, default=10)
    preferred_question_type: Mapped[QuestionType] = mapped_column(
        SAEnum(QuestionType, values_callable=_enum_values), default=QuestionType.MCQ
    )
    answer_display_mode: Mapped[DisplayMode] = mapped_column(
        SAEnum(DisplayMode, values_callable=_enum_values), default=DisplayMode.IMMEDIATE
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="preferences")
