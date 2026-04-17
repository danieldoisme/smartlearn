from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.content import Chapter, Document, Topic
from backend.app.models.quiz import Question, StudySession, UserAnswer, Exam
from backend.app.models.user import User
from backend.app.schemas.dashboard import (
    DashboardActivity,
    DashboardRecentDoc,
    DashboardStats,
    DashboardSummary,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _compute_streak(db: AsyncSession, user_id: int) -> int:
    rows = (
        await db.execute(
            select(func.date(UserAnswer.answered_at))
            .where(UserAnswer.user_id == user_id)
            .group_by(func.date(UserAnswer.answered_at))
            .order_by(desc(func.date(UserAnswer.answered_at)))
        )
    ).all()
    if not rows:
        return 0
    days = [r[0] for r in rows if r[0] is not None]
    if not days:
        return 0
    today = datetime.now(timezone.utc).date()
    streak = 0
    expected = today
    for d in days:
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif d == expected + timedelta(days=1):
            continue
        else:
            break
    return streak


@router.get("/summary", response_model=DashboardSummary)
async def summary(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc_count = (
        await db.execute(
            select(func.count(Document.id)).where(Document.user_id == current.id)
        )
    ).scalar_one()

    answered_count = (
        await db.execute(
            select(func.count(UserAnswer.id)).where(UserAnswer.user_id == current.id)
        )
    ).scalar_one()

    correct_count = (
        await db.execute(
            select(func.count(UserAnswer.id))
            .where(UserAnswer.user_id == current.id)
            .where(UserAnswer.is_correct.is_(True))
        )
    ).scalar_one()

    accuracy = int(round(correct_count / answered_count * 100)) if answered_count else 0
    streak = await _compute_streak(db, current.id)

    recent_docs = (
        (
            await db.execute(
                select(Document)
                .where(Document.user_id == current.id)
                .order_by(desc(Document.updated_at))
                .limit(3)
            )
        )
        .scalars()
        .all()
    )

    topic_map = dict(
        (
            await db.execute(
                select(Topic.id, Topic.name).where(Topic.user_id == current.id)
            )
        ).all()
    )

    doc_ids = [d.id for d in recent_docs]
    chapter_counts: dict[int, int] = {}
    question_counts: dict[int, int] = {}
    answered_counts: dict[int, int] = {}
    if doc_ids:
        cc = await db.execute(
            select(Chapter.document_id, func.count(Chapter.id))
            .where(Chapter.document_id.in_(doc_ids))
            .group_by(Chapter.document_id)
        )
        chapter_counts = {row[0]: row[1] for row in cc.all()}

        qc = await db.execute(
            select(Chapter.document_id, func.count(Question.id))
            .join(Question, Question.chapter_id == Chapter.id)
            .where(Chapter.document_id.in_(doc_ids))
            .group_by(Chapter.document_id)
        )
        question_counts = {row[0]: row[1] for row in qc.all()}

        ac = await db.execute(
            select(
                Chapter.document_id, func.count(func.distinct(UserAnswer.question_id))
            )
            .join(Question, Question.chapter_id == Chapter.id)
            .join(UserAnswer, UserAnswer.question_id == Question.id)
            .where(Chapter.document_id.in_(doc_ids))
            .where(UserAnswer.user_id == current.id)
            .group_by(Chapter.document_id)
        )
        answered_counts = {row[0]: row[1] for row in ac.all()}

    recent_out: List[DashboardRecentDoc] = []
    for d in recent_docs:
        q_total = question_counts.get(d.id, 0)
        answered = answered_counts.get(d.id, 0)
        progress = int(round(answered / q_total * 100)) if q_total else 0
        recent_out.append(
            DashboardRecentDoc(
                id=d.id,
                title=d.title,
                topic_name=topic_map.get(d.topic_id) if d.topic_id else None,
                chapter_count=chapter_counts.get(d.id, 0),
                progress=progress,
            )
        )

    activity: List[DashboardActivity] = []
    last_completed = (
        await db.execute(
            select(StudySession, Chapter.title)
            .join(Chapter, Chapter.id == StudySession.chapter_id)
            .where(StudySession.user_id == current.id)
            .where(StudySession.completed_at.is_not(None))
            .order_by(desc(StudySession.completed_at))
            .limit(1)
        )
    ).first()
    if last_completed:
        activity.append(
            DashboardActivity(
                type="study",
                desc=f"Hoàn thành {last_completed[1]}",
                time=_relative(last_completed[0].completed_at),
            )
        )

    last_exam = (
        await db.execute(
            select(Exam)
            .where(Exam.user_id == current.id)
            .where(Exam.completed_at.is_not(None))
            .order_by(desc(Exam.completed_at))
            .limit(1)
        )
    ).scalar_one_or_none()
    if last_exam:
        activity.append(
            DashboardActivity(
                type="exam",
                desc=f"Kiểm tra tổng hợp — điểm {last_exam.score or 0}",
                time=_relative(last_exam.completed_at),
            )
        )

    wrong_total = (
        await db.execute(
            select(func.count(UserAnswer.id))
            .where(UserAnswer.user_id == current.id)
            .where(UserAnswer.is_correct.is_(False))
            .where(UserAnswer.is_skipped.is_(False))
        )
    ).scalar_one()
    if wrong_total:
        activity.append(
            DashboardActivity(
                type="wrong",
                desc=f"{wrong_total} câu sai cần ôn tập",
                time="Gần đây",
            )
        )

    greeting = (current.full_name or current.email).split()[-1]

    return DashboardSummary(
        greeting_name=greeting,
        stats=DashboardStats(
            document_count=doc_count,
            answered_count=answered_count,
            accuracy=accuracy,
            streak=streak,
        ),
        recent_documents=recent_out,
        recent_activity=activity,
    )


def _relative(d: datetime | None) -> str:
    if d is None:
        return "—"
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    diff = datetime.now(timezone.utc) - d
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
    return f"{days // 7} tuần trước"
