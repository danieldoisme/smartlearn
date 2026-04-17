from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.content import Chapter, Document, Topic
from backend.app.models.quiz import Question, UserAnswer
from backend.app.models.user import User
from backend.app.schemas.document import LibraryDocumentOut
from backend.app.schemas.topic import TopicOut

router = APIRouter(tags=["library"])


@router.get("/topics", response_model=List[TopicOut])
async def list_topics(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Topic)
        .where(Topic.user_id == current.id)
        .order_by(Topic.created_at.desc())
    )
    return [TopicOut.model_validate(t) for t in result.scalars().all()]


@router.get("/documents", response_model=List[LibraryDocumentOut])
async def list_documents(
    topic_id: Optional[int] = Query(default=None),
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Document).where(Document.user_id == current.id)
    if topic_id is not None:
        q = q.where(Document.topic_id == topic_id)
    q = q.order_by(Document.created_at.desc())
    docs = (await db.execute(q)).scalars().all()

    topic_names = dict(
        (
            await db.execute(
                select(Topic.id, Topic.name).where(Topic.user_id == current.id)
            )
        ).all()
    )

    doc_ids = [d.id for d in docs]
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

    out: List[LibraryDocumentOut] = []
    for d in docs:
        q_count = question_counts.get(d.id, 0)
        a_count = answered_counts.get(d.id, 0)
        progress = int(round(a_count / q_count * 100)) if q_count else 0
        out.append(
            LibraryDocumentOut(
                id=d.id,
                user_id=d.user_id,
                topic_id=d.topic_id,
                title=d.title,
                file_path=d.file_path,
                file_type=d.file_type,
                file_size=d.file_size,
                created_at=d.created_at,
                updated_at=d.updated_at,
                topic_name=topic_names.get(d.topic_id) if d.topic_id else None,
                chapter_count=chapter_counts.get(d.id, 0),
                question_count=q_count,
                progress=progress,
            )
        )
    return out
