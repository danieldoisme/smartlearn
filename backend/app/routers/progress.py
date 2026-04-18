from datetime import date, datetime, time, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.content import Chapter, Document
from backend.app.models.quiz import Question, StudySession, UserAnswer
from backend.app.models.user import User
from backend.app.schemas.progress import (
    AccuracyPoint,
    ChapterProgressDetail,
    DocumentProgress,
    DocumentProgressDetail,
    QuestionAttemptDetail,
    WeeklyPoint,
)

router = APIRouter(prefix="/progress", tags=["progress"])

_VI_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]


def _normalize_range(
    start_date: date | None,
    end_date: date | None,
    *,
    default_days: int | None = None,
) -> tuple[date, date]:
    today = datetime.now(timezone.utc).date()
    if end_date is None:
        end_date = today
    if start_date is None:
        if default_days is None:
            start_date = end_date - timedelta(days=3650)
        else:
            start_date = end_date - timedelta(days=default_days - 1)
    if start_date > end_date:
        start_date, end_date = end_date, start_date
    return start_date, end_date


def _to_dt_range(start_date: date, end_date: date) -> tuple[datetime, datetime]:
    return (
        datetime.combine(start_date, time.min, tzinfo=timezone.utc),
        datetime.combine(end_date, time.max, tzinfo=timezone.utc),
    )


def _format_relative(d: datetime | None, now: datetime) -> str | None:
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


def _answer_range_clause(
    start_dt: datetime,
    end_dt: datetime,
):
    return and_(UserAnswer.answered_at >= start_dt, UserAnswer.answered_at <= end_dt)


@router.get("/weekly", response_model=List[WeeklyPoint])
async def weekly(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_date, end_date = _normalize_range(start_date, end_date, default_days=7)
    start_dt, end_dt = _to_dt_range(start_date, end_date)

    rows = (
        await db.execute(
            select(UserAnswer.answered_at, UserAnswer.is_correct)
            .where(UserAnswer.user_id == current.id)
            .where(_answer_range_clause(start_dt, end_dt))
        )
    ).all()

    total_days = (end_date - start_date).days + 1
    buckets = {i: {"questions": 0, "correct": 0} for i in range(total_days)}
    for answered_at, is_correct in rows:
        d = answered_at.date() if hasattr(answered_at, "date") else answered_at
        idx = (d - start_date).days
        if 0 <= idx < total_days:
            buckets[idx]["questions"] += 1
            if is_correct:
                buckets[idx]["correct"] += 1

    out: List[WeeklyPoint] = []
    for i in range(total_days):
        day_date = start_date + timedelta(days=i)
        label = (
            _VI_WEEKDAYS[day_date.weekday()]
            if total_days <= 7
            else day_date.strftime("%d/%m")
        )
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
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_date, end_date = _normalize_range(start_date, end_date, default_days=42)
    start_dt, end_dt = _to_dt_range(start_date, end_date)

    rows = (
        await db.execute(
            select(UserAnswer.answered_at, UserAnswer.is_correct)
            .where(UserAnswer.user_id == current.id)
            .where(_answer_range_clause(start_dt, end_dt))
        )
    ).all()

    total_days = max((end_date - start_date).days + 1, 1)
    bucket_count = min(6, total_days)
    bucket_size = max((total_days + bucket_count - 1) // bucket_count, 1)
    buckets = [{"total": 0, "correct": 0} for _ in range(bucket_count)]

    for answered_at, is_correct in rows:
        d = answered_at.date() if hasattr(answered_at, "date") else answered_at
        delta_days = (d - start_date).days
        idx = min(max(delta_days // bucket_size, 0), bucket_count - 1)
        buckets[idx]["total"] += 1
        if is_correct:
            buckets[idx]["correct"] += 1

    out: List[AccuracyPoint] = []
    for i, bucket in enumerate(buckets):
        bucket_start = start_date + timedelta(days=i * bucket_size)
        bucket_end = min(end_date, bucket_start + timedelta(days=bucket_size - 1))
        label = (
            f"Tuần {i + 1}"
            if start_date == end_date - timedelta(days=41)
            else f"{bucket_start.strftime('%d/%m')}–{bucket_end.strftime('%d/%m')}"
        )
        acc = (
            int(round(bucket["correct"] / bucket["total"] * 100))
            if bucket["total"]
            else 0
        )
        out.append(AccuracyPoint(week=label, accuracy=acc))
    return out


@router.get("/documents", response_model=List[DocumentProgress])
async def documents(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_date, end_date = _normalize_range(start_date, end_date)
    start_dt, end_dt = _to_dt_range(start_date, end_date)

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
            .where(_answer_range_clause(start_dt, end_dt))
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
            .where(StudySession.completed_at >= start_dt)
            .where(StudySession.completed_at <= end_dt)
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
            .where(_answer_range_clause(start_dt, end_dt))
            .group_by(Chapter.document_id)
        )
    ).all()
    last_map = {row[0]: row[1] for row in last_rows}

    now = datetime.now(timezone.utc)
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
                last_studied=_format_relative(last_map.get(d.id), now),
            )
        )
    return out


@router.get("/documents/{document_id}", response_model=DocumentProgressDetail)
async def document_detail(
    document_id: int,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_date, end_date = _normalize_range(start_date, end_date)
    start_dt, end_dt = _to_dt_range(start_date, end_date)

    document = (
        await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.user_id == current.id)
        )
    ).scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    latest_subq = (
        select(
            UserAnswer.question_id.label("qid"),
            func.max(UserAnswer.answered_at).label("last_answered"),
            func.count(UserAnswer.id).label("attempt_count"),
        )
        .where(UserAnswer.user_id == current.id)
        .where(_answer_range_clause(start_dt, end_dt))
        .group_by(UserAnswer.question_id)
        .subquery()
    )

    rows = (
        await db.execute(
            select(
                Chapter.id,
                Chapter.title,
                Question.id,
                Question.content,
                Question.correct_answer,
                UserAnswer.selected_answer,
                UserAnswer.is_correct,
                UserAnswer.is_skipped,
                latest_subq.c.attempt_count,
                latest_subq.c.last_answered,
            )
            .join(Question, Question.chapter_id == Chapter.id)
            .join(latest_subq, latest_subq.c.qid == Question.id)
            .join(
                UserAnswer,
                and_(
                    UserAnswer.question_id == Question.id,
                    UserAnswer.answered_at == latest_subq.c.last_answered,
                    UserAnswer.user_id == current.id,
                ),
            )
            .where(Chapter.document_id == document.id)
            .order_by(Chapter.order_index, desc(latest_subq.c.last_answered))
        )
    ).all()

    chapter_question_counts = dict(
        (
            row[0],
            row[1],
        )
        for row in (
            await db.execute(
                select(Chapter.id, func.count(Question.id))
                .join(Question, Question.chapter_id == Chapter.id)
                .where(Chapter.document_id == document.id)
                .group_by(Chapter.id)
            )
        ).all()
    )

    grouped: dict[int, dict] = {}
    total_attempts = 0
    total_correct = 0
    for (
        chapter_id,
        chapter_title,
        question_id,
        content,
        correct_answer,
        selected_answer,
        is_correct,
        is_skipped,
        attempt_count,
        last_answered,
    ) in rows:
        chapter_entry = grouped.setdefault(
            chapter_id,
            {
                "chapter_id": chapter_id,
                "chapter_title": chapter_title,
                "answered_count": 0,
                "correct_count": 0,
                "question_count": chapter_question_counts.get(chapter_id, 0),
                "questions": [],
            },
        )
        chapter_entry["answered_count"] += 1
        total_attempts += 1
        if is_correct:
            chapter_entry["correct_count"] += 1
            total_correct += 1
        chapter_entry["questions"].append(
            QuestionAttemptDetail(
                question_id=question_id,
                content=content,
                selected_answer=selected_answer,
                correct_answer=correct_answer,
                is_correct=bool(is_correct),
                is_skipped=bool(is_skipped),
                attempt_count=int(attempt_count or 0),
                last_answered_at=last_answered.isoformat() if last_answered else None,
            )
        )

    chapter_details: list[ChapterProgressDetail] = []
    for chapter in grouped.values():
        answered_count = chapter["answered_count"]
        correct_count = chapter["correct_count"]
        accuracy = (
            int(round(correct_count / answered_count * 100)) if answered_count else 0
        )
        chapter_details.append(
            ChapterProgressDetail(
                chapter_id=chapter["chapter_id"],
                chapter_title=chapter["chapter_title"],
                accuracy=accuracy,
                answered_count=answered_count,
                question_count=chapter["question_count"],
                questions=chapter["questions"],
            )
        )

    overall_accuracy = (
        int(round(total_correct / total_attempts * 100)) if total_attempts else 0
    )
    return DocumentProgressDetail(
        document_id=document.id,
        title=document.title,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        answered_count=total_attempts,
        accuracy=overall_accuracy,
        chapters=chapter_details,
    )
