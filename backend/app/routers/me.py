from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.deps import get_current_user, get_db
from backend.app.core.security import hash_password, verify_password
from backend.app.models.user import User, UserPreference
from backend.app.schemas.preferences import UserPreferenceOut, UserPreferenceUpdate
from backend.app.schemas.user import PasswordChange, UserOut, UserUpdate

router = APIRouter(tags=["me"])


@router.get("/me", response_model=UserOut)
async def read_me(current: User = Depends(get_current_user)):
    return UserOut.model_validate(current)


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ALLOWED_USER_FIELDS = {"full_name", "email", "avatar_url"}
    data = payload.model_dump(exclude_unset=True)
    if "email" in data and data["email"] != current.email:
        dup = await db.execute(select(User).where(User.email == data["email"]))
        if dup.scalar_one_or_none():
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use")

    for key, value in data.items():
        if key not in _ALLOWED_USER_FIELDS:
            continue
        setattr(current, key, value)

    await db.commit()
    await db.refresh(current)
    return UserOut.model_validate(current)


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: PasswordChange,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current.password_hash):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Current password is incorrect"
        )
    current.password_hash = hash_password(payload.new_password)
    await db.commit()
    return None


async def _get_or_create_prefs(db: AsyncSession, user_id: int) -> UserPreference:
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == user_id)
    )
    prefs = result.scalar_one_or_none()
    if prefs is None:
        prefs = UserPreference(user_id=user_id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    return prefs


@router.get("/me/preferences", response_model=UserPreferenceOut)
async def read_preferences(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prefs = await _get_or_create_prefs(db, current.id)
    return UserPreferenceOut.model_validate(prefs)


@router.patch("/me/preferences", response_model=UserPreferenceOut)
async def update_preferences(
    payload: UserPreferenceUpdate,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ALLOWED_PREF_FIELDS = {
        "default_question_count",
        "preferred_question_type",
        "answer_display_mode",
    }
    prefs = await _get_or_create_prefs(db, current.id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key not in _ALLOWED_PREF_FIELDS:
            continue
        setattr(prefs, key, value)
    await db.commit()
    await db.refresh(prefs)
    return UserPreferenceOut.model_validate(prefs)
