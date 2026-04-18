from pydantic import EmailStr, Field

from backend.app.schemas.base import CamelModel
from backend.app.schemas.user import UserOut


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class RegisterRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)


class TokenResponse(CamelModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PasswordResetRequestIn(CamelModel):
    email: EmailStr


class PasswordResetRequestOut(CamelModel):
    message: str
    reset_token: str


class PasswordResetConfirmIn(CamelModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=128)
