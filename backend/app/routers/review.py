from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.content import Chapter, Document
from backend.app.models.enums import QuestionType
from backend.app.models.quiz import Question, UserAnswer
from backend.app.models.user import User
from backend.app.schemas.review import ReviewChapter, ReviewDocument, ReviewQuestion

router = APIRouter(prefix="/review", tags=["review"])


def _answer_format(question: Question) -> str:
    return "text" if question.question_type == QuestionType.FILL else "label"


def _answer_value(question: Question) -> str | None:
    if question.question_type == QuestionType.FILL:
        return question.correct_answer
    labels = sorted(option.label for option in question.options if option.is_correct)
    return ",".join(labels) if labels else None


def _answer_display(question: Question, raw_value: str | None) -> str | None:
    if not raw_value:
        return None
    if question.question_type == QuestionType.FILL:
        return raw_value

    option_map = {option.label.upper(): option.content for option in question.options}
    labels = [part.strip().upper() for part in raw_value.split(",") if part.strip()]
    if not labels:
        return raw_value
    return ", ".join(f"{label} — {option_map.get(label, label)}" for label in labels)


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
                Question,
                UserAnswer.selected_answer,
                latest_subq.c.last_answered,
                latest_subq.c.attempt_count,
            )
            .join(Chapter, Chapter.document_id == Document.id)
            .join(Question, Question.chapter_id == Chapter.id)
            .options(selectinload(Question.options))
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
        question,
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
                id=question.id,
                content=question.content,
                question_type=question.question_type,
                answer_format=_answer_format(question),
                selected_answer_value=selected,
                selected_answer_display=_answer_display(question, selected),
                correct_answer_value=_answer_value(question),
                correct_answer_display=_answer_display(
                    question, _answer_value(question)
                ),
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
