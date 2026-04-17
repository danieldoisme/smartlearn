from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.content import Chapter, Document
from backend.app.models.quiz import Question, UserAnswer
from backend.app.models.user import User
from backend.app.schemas.review import ReviewChapter, ReviewDocument, ReviewQuestion

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/wrong-questions", response_model=List[ReviewDocument])
async def wrong_questions(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    latest_subq = (
        select(
            UserAnswer.question_id.label("qid"),
            func.max(UserAnswer.answered_at).label("last_answered"),
            func.count(UserAnswer.id).label("attempt_count"),
        )
        .where(UserAnswer.user_id == current.id)
        .group_by(UserAnswer.question_id)
        .subquery()
    )

    rows = (
        await db.execute(
            select(
                Document.id,
                Document.title,
                Chapter.id,
                Chapter.title,
                Chapter.order_index,
                Question.id,
                Question.content,
                Question.question_type,
                Question.correct_answer,
                UserAnswer.selected_answer,
                latest_subq.c.last_answered,
                latest_subq.c.attempt_count,
            )
            .join(Chapter, Chapter.document_id == Document.id)
            .join(Question, Question.chapter_id == Chapter.id)
            .join(latest_subq, latest_subq.c.qid == Question.id)
            .join(
                UserAnswer,
                (UserAnswer.question_id == Question.id)
                & (UserAnswer.answered_at == latest_subq.c.last_answered)
                & (UserAnswer.user_id == current.id),
            )
            .where(UserAnswer.is_correct.is_(False))
            .where(UserAnswer.is_skipped.is_(False))
            .where(Document.user_id == current.id)
            .order_by(Document.id, Chapter.order_index, Question.id)
        )
    ).all()

    docs: dict[int, dict] = {}
    for (
        doc_id,
        doc_title,
        ch_id,
        ch_title,
        _ch_order,
        q_id,
        q_content,
        q_type,
        q_correct,
        selected,
        last_at,
        attempts,
    ) in rows:
        doc_entry = docs.setdefault(
            doc_id, {"document_title": doc_title, "chapters": {}}
        )
        ch_entry = doc_entry["chapters"].setdefault(
            ch_id, {"chapter_id": ch_id, "title": ch_title, "questions": []}
        )
        ch_entry["questions"].append(
            ReviewQuestion(
                id=q_id,
                content=q_content,
                question_type=q_type,
                selected_answer=selected,
                correct_answer=q_correct,
                attempt_count=int(attempts or 1),
                last_answered_at=last_at,
            )
        )

    out: List[ReviewDocument] = []
    for d in docs.values():
        out.append(
            ReviewDocument(
                document_title=d["document_title"],
                chapters=[ReviewChapter(**c) for c in d["chapters"].values()],
            )
        )
    return out
