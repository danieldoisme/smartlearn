"""Reset a user's password by email.

Usage:
    uv run python -m backend.scripts.reset_password <email> <new_password>

Example:
    uv run python -m backend.scripts.reset_password thanh.duc@example.com demo1234
"""

import asyncio
import sys

from sqlalchemy import select

from backend.app.core.security import hash_password
from backend.app.database import AsyncSessionLocal
from backend.app.models.user import User, UserPreference


async def reset(email: str, new_password: str) -> int:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            print(f"[reset_password] User not found: {email}", file=sys.stderr)
            return 1

        user.password_hash = hash_password(new_password)

        prefs = (
            await db.execute(
                select(UserPreference).where(UserPreference.user_id == user.id)
            )
        ).scalar_one_or_none()
        if prefs is None:
            db.add(UserPreference(user_id=user.id))

        await db.commit()
        print(
            f"[reset_password] OK — user_id={user.id} email={email} password updated."
        )
        return 0


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    return asyncio.run(reset(sys.argv[1], sys.argv[2]))


if __name__ == "__main__":
    raise SystemExit(main())
