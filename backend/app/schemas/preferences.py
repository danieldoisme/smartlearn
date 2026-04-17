from typing import Optional

from pydantic import Field

from backend.app.models.enums import QuestionType, DisplayMode
from backend.app.schemas.base import CamelModel


class UserPreferenceOut(CamelModel):
    id: int
    user_id: int
    default_question_count: int
    preferred_question_type: QuestionType
    answer_display_mode: DisplayMode


class UserPreferenceUpdate(CamelModel):
    default_question_count: Optional[int] = Field(default=None, ge=1, le=100)
    preferred_question_type: Optional[QuestionType] = None
    answer_display_mode: Optional[DisplayMode] = None
