from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.core.deps import get_db
from backend.app.core.security import (
    create_access_token,
    generate_reset_token_plain,
    hash_password,
    hash_reset_token,
    verify_password,
)
from backend.app.models.user import PasswordResetToken, User, UserPreference
from backend.app.schemas.auth import (
    LoginRequest,
    PasswordResetConfirmIn,
    PasswordResetRequestIn,
    PasswordResetRequestOut,
    RegisterRequest,
    TokenResponse,
)
from backend.app.schemas.user import UserOut
from backend.app.services.email import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])

_GENERIC_RESET_MESSAGE = (
    "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. "
    "Vui lòng kiểm tra hộp thư (kể cả thư rác)."
)


@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        email_verified=True,
    )
    db.add(user)
    await db.flush()

    db.add(UserPreference(user_id=user.id))
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/password-reset/request", response_model=PasswordResetRequestOut)
async def request_password_reset(
    payload: PasswordResetRequestIn, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None:
        return PasswordResetRequestOut(message=_GENERIC_RESET_MESSAGE)

    now = datetime.now(timezone.utc)
    await db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=now)
    )

    plain = generate_reset_token_plain()
    token_row = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_reset_token(plain),
        expires_at=now + timedelta(minutes=settings.RESET_TOKEN_TTL_MINUTES),
    )
    db.add(token_row)
    await db.commit()

    reset_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password?token={plain}"
    await send_password_reset_email(user.email, reset_url)

    return PasswordResetRequestOut(message=_GENERIC_RESET_MESSAGE)


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_password_reset(
    payload: PasswordResetConfirmIn, db: AsyncSession = Depends(get_db)
):
    token_hash = hash_reset_token(payload.token)
    row = (
        await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash
            )
        )
    ).scalar_one_or_none()

    invalid = HTTPException(
        status.HTTP_400_BAD_REQUEST,
        "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
    )
    if row is None or row.used_at is not None:
        raise invalid

    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    if expires_at < now:
        raise invalid

    user = (
        await db.execute(select(User).where(User.id == row.user_id))
    ).scalar_one_or_none()
    if user is None:
        raise invalid

    user.password_hash = hash_password(payload.new_password)
    row.used_at = now
    await db.commit()
    return None
