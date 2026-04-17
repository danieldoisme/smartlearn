from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

from backend.app.config import settings


def _truncate(plain: str) -> bytes:
    # bcrypt algorithm ignores bytes past 72; truncate deterministically.
    return plain.encode("utf-8")[:72]


def hash_password(plain: str) -> str:
    hashed = bcrypt.hashpw(_truncate(plain), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(_truncate(plain), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(
    subject: str | int, expires_minutes: Optional[int] = None
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.JWT_EXPIRE_MINUTES
    )
    payload = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
