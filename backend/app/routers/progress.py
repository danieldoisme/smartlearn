from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.content import Chapter, Document
from backend.app.models.quiz import Question, StudySession, UserAnswer
from backend.app.models.user import User
from backend.app.schemas.progress import (
    AccuracyPoint,
    DocumentProgress,
    WeeklyPoint,
)

router = APIRouter(prefix="/progress", tags=["progress"])

_VI_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]


@router.get("/weekly", response_model=List[WeeklyPoint])
async def weekly(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=6)

    rows = (
        await db.execute(
            select(UserAnswer.answered_at, UserAnswer.is_correct)
            .where(UserAnswer.user_id == current.id)
            .where(
                UserAnswer.answered_at >= datetime.combine(start, datetime.min.time())
            )
        )
    ).all()

    buckets = {i: {"questions": 0, "correct": 0} for i in range(7)}
    for answered_at, is_correct in rows:
        d = answered_at.date() if hasattr(answered_at, "date") else answered_at
        idx = (d - start).days
        if 0 <= idx < 7:
            buckets[idx]["questions"] += 1
            if is_correct:
                buckets[idx]["correct"] += 1

    out: List[WeeklyPoint] = []
    for i in range(7):
        day_date = start + timedelta(days=i)
        label = _VI_WEEKDAYS[day_date.weekday()]
        out.append(
            WeeklyPoint(
                day=label,
                questions=buckets[i]["questions"],
                correct=buckets[i]["correct"],
            )
        )
    return out


@router.get("/accuracy-trend", response_model=List[AccuracyPoint])
async def accuracy_trend(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(weeks=6)

    rows = (
        await db.execute(
            select(UserAnswer.answered_at, UserAnswer.is_correct)
            .where(UserAnswer.user_id == current.id)
            .where(
                UserAnswer.answered_at >= datetime.combine(start, datetime.min.time())
            )
        )
    ).all()

    weeks = [{"total": 0, "correct": 0} for _ in range(6)]
    for answered_at, is_correct in rows:
        d = answered_at.date() if hasattr(answered_at, "date") else answered_at
        delta_days = (d - start).days
        idx = min(max(delta_days // 7, 0), 5)
        weeks[idx]["total"] += 1
        if is_correct:
            weeks[idx]["correct"] += 1

    out: List[AccuracyPoint] = []
    for i, w in enumerate(weeks):
        acc = int(round(w["correct"] / w["total"] * 100)) if w["total"] else 0
        out.append(AccuracyPoint(week=f"Tuần {i + 1}", accuracy=acc))
    return out


@router.get("/documents", response_model=List[DocumentProgress])
async def documents(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    docs = (
        (
            await db.execute(
                select(Document)
                .where(Document.user_id == current.id)
                .order_by(Document.updated_at.desc())
            )
        )
        .scalars()
        .all()
    )
    if not docs:
        return []

    doc_ids = [d.id for d in docs]

    chapter_counts = dict(
        (row[0], row[1])
        for row in (
            await db.execute(
                select(Chapter.document_id, func.count(Chapter.id))
                .where(Chapter.document_id.in_(doc_ids))
                .group_by(Chapter.document_id)
            )
        ).all()
    )

    question_counts = dict(
        (row[0], row[1])
        for row in (
            await db.execute(
                select(Chapter.document_id, func.count(Question.id))
                .join(Question, Question.chapter_id == Chapter.id)
                .where(Chapter.document_id.in_(doc_ids))
                .group_by(Chapter.document_id)
            )
        ).all()
    )

    answer_rows = (
        await db.execute(
            select(
                Chapter.document_id,
                func.count(func.distinct(UserAnswer.question_id)).label("answered"),
                func.sum(func.if_(UserAnswer.is_correct, 1, 0)).label("correct"),
                func.count(UserAnswer.id).label("total_attempts"),
            )
            .join(Question, Question.chapter_id == Chapter.id)
            .join(UserAnswer, UserAnswer.question_id == Question.id)
            .where(Chapter.document_id.in_(doc_ids))
            .where(UserAnswer.user_id == current.id)
            .group_by(Chapter.document_id)
        )
    ).all()
    answer_stats = {
        row[0]: {
            "answered": row[1] or 0,
            "correct": row[2] or 0,
            "attempts": row[3] or 0,
        }
        for row in answer_rows
    }

    completed_rows = (
        await db.execute(
            select(
                Chapter.document_id, func.count(func.distinct(StudySession.chapter_id))
            )
            .join(Chapter, Chapter.id == StudySession.chapter_id)
            .where(StudySession.user_id == current.id)
            .where(StudySession.completed_at.is_not(None))
            .where(Chapter.document_id.in_(doc_ids))
            .group_by(Chapter.document_id)
        )
    ).all()
    completed_map = {row[0]: row[1] or 0 for row in completed_rows}

    last_rows = (
        await db.execute(
            select(Chapter.document_id, func.max(UserAnswer.answered_at))
            .join(Question, Question.chapter_id == Chapter.id)
            .join(UserAnswer, UserAnswer.question_id == Question.id)
            .where(Chapter.document_id.in_(doc_ids))
            .where(UserAnswer.user_id == current.id)
            .group_by(Chapter.document_id)
        )
    ).all()
    last_map = {row[0]: row[1] for row in last_rows}

    now = datetime.now(timezone.utc)

    def _format_relative(d: datetime | None) -> str | None:
        if d is None:
            return None
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        diff = now - d
        hours = int(diff.total_seconds() // 3600)
        if hours < 1:
            return "Vừa xong"
        if hours < 24:
            return f"{hours} giờ trước"
        days = hours // 24
        if days == 1:
            return "1 ngày trước"
        if days < 7:
            return f"{days} ngày trước"
        weeks = days // 7
        if weeks == 1:
            return "1 tuần trước"
        return f"{weeks} tuần trước"

    out: List[DocumentProgress] = []
    for d in docs:
        q_count = question_counts.get(d.id, 0)
        stats = answer_stats.get(d.id, {"answered": 0, "correct": 0, "attempts": 0})
        acc = (
            int(round(stats["correct"] / stats["attempts"] * 100))
            if stats["attempts"]
            else 0
        )
        out.append(
            DocumentProgress(
                id=d.id,
                title=d.title,
                chapter_count=chapter_counts.get(d.id, 0),
                chapters_completed=completed_map.get(d.id, 0),
                question_count=q_count,
                answered_count=stats["answered"],
                accuracy=acc,
                last_studied=_format_relative(last_map.get(d.id)),
            )
        )
    return out
