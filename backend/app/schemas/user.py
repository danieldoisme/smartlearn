from datetime import datetime
from typing import Optional

from pydantic import EmailStr, Field

from backend.app.schemas.base import CamelModel


class UserOut(CamelModel):
    id: int
    full_name: Optional[str] = None
    email: EmailStr
    avatar_url: Optional[str] = None
    email_verified: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserUpdate(CamelModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None


class PasswordChange(CamelModel):
    current_password: str = Field(min_length=6, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)
