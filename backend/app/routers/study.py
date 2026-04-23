from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.content import Chapter, Document
from backend.app.models.enums import QuestionType, SessionType
from backend.app.models.quiz import (
    Question,
    StudySession,
    UserAnswer,
)
from backend.app.models.user import User, UserPreference
from backend.app.schemas.quiz import (
    AvailableStudyChapterOut,
    QuestionOptionOut,
    QuestionOut,
    StudyAnswerIn,
    StudyAnswerOut,
    StudySessionCompleteOut,
    StudySessionStart,
    StudySessionStartOut,
)

router = APIRouter(prefix="/study-sessions", tags=["study"])


def _normalize(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _multi_set(value: Optional[str]) -> set[str]:
    if not value:
        return set()
    return {p.strip().upper() for p in value.split(",") if p.strip()}


def _grade(
    question: Question, selected_answer: Optional[str]
) -> tuple[bool, Optional[str], Optional[str]]:
    """Return (is_correct, correct_answer_text, correct_label)."""
    if question.question_type == QuestionType.FILL:
        correct = question.correct_answer or ""
        is_correct = bool(selected_answer) and _normalize(
            selected_answer
        ) == _normalize(correct)
        return is_correct, correct, None

    correct_opts = [o for o in question.options if o.is_correct]
    correct_labels = sorted(o.label for o in correct_opts)
    correct_label_str = ",".join(correct_labels)

    if question.question_type == QuestionType.MULTI:
        sel = _multi_set(selected_answer)
        is_correct = bool(sel) and sel == set(correct_labels)
        return is_correct, correct_label_str, correct_label_str

    # MCQ
    is_correct = bool(selected_answer) and selected_answer.strip().upper() in set(
        correct_labels
    )
    return is_correct, correct_label_str, correct_label_str


def _build_source_context(
    content_text: Optional[str], source_text: Optional[str], radius: int = 180
) -> Optional[str]:
    if not content_text or not source_text:
        return None
    content = " ".join(content_text.split())
    source = " ".join(source_text.split())
    lower_content = content.lower()
    lower_source = source.lower()
    index = lower_content.find(lower_source)
    if index == -1:
        return None
    start = max(0, index - radius)
    end = min(len(content), index + len(source) + radius)
    snippet = content[start:end].strip()
    if start > 0:
        snippet = f"…{snippet}"
    if end < len(content):
        snippet = f"{snippet}…"
    return snippet


def _pick_session_questions(
    q_rows: list[Question], answered_ids: set[int], limit: int
) -> list[Question]:
    if limit <= 0:
        return []
    unanswered = [q for q in q_rows if q.id not in answered_ids]
    if unanswered:
        return unanswered[:limit]
    return q_rows[:limit]


async def _own_chapter(db: AsyncSession, chapter_id: int, user_id: int) -> Chapter:
    row = await db.execute(
        select(Chapter)
        .join(Document, Document.id == Chapter.document_id)
        .where(Chapter.id == chapter_id)
        .where(Document.user_id == user_id)
    )
    chapter = row.scalar_one_or_none()
    if chapter is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chapter not found")
    return chapter


async def _own_session(db: AsyncSession, session_id: int, user_id: int) -> StudySession:
    row = await db.execute(
        select(StudySession)
        .where(StudySession.id == session_id)
        .where(StudySession.user_id == user_id)
    )
    sess = row.scalar_one_or_none()
    if sess is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return sess


def _to_question_out(q: Question, ans: Optional[UserAnswer] = None) -> QuestionOut:
    chapter = getattr(q, "chapter", None)
    document = getattr(chapter, "document", None) if chapter is not None else None
    return QuestionOut(
        id=q.id,
        chapter_id=q.chapter_id,
        question_type=q.question_type,
        content=q.content,
        chapter_title=chapter.title if chapter is not None else None,
        document_id=document.id if document is not None else None,
        document_title=document.title if document is not None else None,
        source_text=q.source_text,
        source_context=_build_source_context(
            chapter.content_text if chapter is not None else None,
            q.source_text,
        ),
        source_page=q.source_page,
        options=[
            QuestionOptionOut(id=o.id, label=o.label, content=o.content)
            for o in sorted(q.options, key=lambda x: x.label)
        ],
        user_answer=ans.selected_answer if ans else None,
        is_correct=ans.is_correct if ans else None,
    )


@router.get("/available-chapters", response_model=list[AvailableStudyChapterOut])
async def list_available_chapters(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chapter_rows = (
        await db.execute(
            select(
                Chapter.id,
                Chapter.title,
                Document.id,
                Document.title,
                func.count(Question.id).label("question_count"),
            )
            .join(Document, Document.id == Chapter.document_id)
            .join(Question, Question.chapter_id == Chapter.id)
            .where(Document.user_id == current.id)
            .group_by(Chapter.id, Chapter.title, Document.id, Document.title)
            .order_by(Document.title, Chapter.order_index)
        )
    ).all()

    if not chapter_rows:
        return []

    chapter_ids = [row[0] for row in chapter_rows]
    answered_rows = (
        await db.execute(
            select(
                Question.chapter_id,
                func.count(func.distinct(UserAnswer.question_id)).label(
                    "answered_count"
                ),
            )
            .join(UserAnswer, UserAnswer.question_id == Question.id)
            .where(Question.chapter_id.in_(chapter_ids))
            .where(UserAnswer.user_id == current.id)
            .group_by(Question.chapter_id)
        )
    ).all()
    answered_map = {row[0]: int(row[1] or 0) for row in answered_rows}

    out: list[AvailableStudyChapterOut] = []
    for (
        chapter_id,
        chapter_title,
        document_id,
        document_title,
        question_count,
    ) in chapter_rows:
        answered_count = answered_map.get(chapter_id, 0)
        progress = (
            int(round(answered_count / question_count * 100)) if question_count else 0
        )
        out.append(
            AvailableStudyChapterOut(
                chapter_id=chapter_id,
                chapter_title=chapter_title,
                document_id=document_id,
                document_title=document_title,
                question_count=int(question_count or 0),
                answered_count=answered_count,
                progress=progress,
            )
        )
    return out


@router.post("", response_model=StudySessionStartOut)
async def start_session(
    payload: StudySessionStart,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _own_chapter(db, payload.chapter_id, current.id)
    
    if payload.restart:
        await db.execute(
            delete(UserAnswer)
            .where(UserAnswer.user_id == current.id)
            .where(UserAnswer.question_id.in_(
                select(Question.id).where(Question.chapter_id == payload.chapter_id)
            ))
        )
        await db.commit()

    limit = payload.question_limit
    if limit is None:
        prefs = (
            await db.execute(
                select(UserPreference).where(UserPreference.user_id == current.id)
            )
        ).scalar_one_or_none()
        limit = prefs.default_question_count if prefs else 10

    question_ids = [qid for qid in payload.question_ids if isinstance(qid, int)]
    if question_ids:
        ordered_ids = list(dict.fromkeys(question_ids))
        fetched = (
            (
                await db.execute(
                    select(Question)
                    .options(
                        selectinload(Question.options),
                        selectinload(Question.chapter).selectinload(Chapter.document),
                    )
                    .where(Question.chapter_id == payload.chapter_id)
                    .where(Question.id.in_(ordered_ids))
                )
            )
            .scalars()
            .all()
        )
        by_id = {q.id: q for q in fetched}
        q_rows = [by_id[qid] for qid in ordered_ids if qid in by_id]
    else:
        q_rows = (
            (
                await db.execute(
                    select(Question)
                    .options(
                        selectinload(Question.options),
                        selectinload(Question.chapter).selectinload(Chapter.document),
                    )
                    .where(Question.chapter_id == payload.chapter_id)
                    .order_by(Question.id)
                )
            )
            .scalars()
            .all()
        )

        if payload.session_type == SessionType.LEARN:
            # For LEARN mode, return ALL questions for the chapter
            q_rows = q_rows  # No filtering by limit or answered
        else:
            q_rows = q_rows[:limit]

    if not q_rows:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Chương này chưa có câu hỏi")

    session = StudySession(
        user_id=current.id,
        chapter_id=payload.chapter_id,
        session_type=payload.session_type,
        total_questions=len(q_rows),
        correct_count=0,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    ans_map = {}
    if q_rows:
        ans_rows = (
            await db.execute(
                select(UserAnswer)
                .where(UserAnswer.user_id == current.id)
                .where(UserAnswer.question_id.in_([q.id for q in q_rows]))
                .order_by(UserAnswer.answered_at.desc())
            )
        ).scalars().all()
        for ans in ans_rows:
            if ans.question_id not in ans_map:
                ans_map[ans.question_id] = ans

    return StudySessionStartOut(
        session_id=session.id,
        chapter_id=session.chapter_id,
        session_type=session.session_type,
        questions=[_to_question_out(q, ans_map.get(q.id)) for q in q_rows],
    )


@router.post("/{session_id}/answers", response_model=StudyAnswerOut)
async def submit_answer(
    session_id: int,
    payload: StudyAnswerIn,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _own_session(db, session_id, current.id)
    if session.completed_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Session already completed")

    q = (
        await db.execute(
            select(Question)
            .options(selectinload(Question.options))
            .where(Question.id == payload.question_id)
            .where(Question.chapter_id == session.chapter_id)
        )
    ).scalar_one_or_none()
    if q is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Question not in session chapter"
        )

    if payload.is_skipped:
        is_correct, correct_answer, correct_label = False, None, None
    else:
        is_correct, correct_answer, correct_label = _grade(q, payload.selected_answer)

    # Upsert: check for existing answer for this question and user
    existing_row = (
        await db.execute(
            select(UserAnswer)
            .where(UserAnswer.user_id == current.id)
            .where(UserAnswer.question_id == q.id)
        )
    ).scalar_one_or_none()

    if existing_row:
        existing_row.session_id = session.id
        existing_row.selected_answer = payload.selected_answer if not payload.is_skipped else None
        existing_row.is_correct = is_correct
        existing_row.is_skipped = payload.is_skipped
        existing_row.answered_at = datetime.now(timezone.utc)
    else:
        db.add(
            UserAnswer(
                session_id=session.id,
                question_id=q.id,
                user_id=current.id,
                selected_answer=payload.selected_answer if not payload.is_skipped else None,
                is_correct=is_correct,
                is_skipped=payload.is_skipped,
            )
        )
    await db.commit()

    return StudyAnswerOut(
        question_id=q.id,
        is_correct=is_correct,
        is_skipped=payload.is_skipped,
        correct_answer=correct_answer,
        correct_label=correct_label,
    )


@router.post("/{session_id}/complete", response_model=StudySessionCompleteOut)
async def complete_session(
    session_id: int,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _own_session(db, session_id, current.id)
    if session.completed_at is None:
        rows = (
            await db.execute(
                select(UserAnswer.is_correct).where(UserAnswer.session_id == session.id)
            )
        ).all()
        total = len(rows)
        correct = sum(1 for r in rows if r[0])
        session.total_questions = total or session.total_questions
        session.correct_count = correct
        session.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(session)

    return StudySessionCompleteOut(
        session_id=session.id,
        total_questions=session.total_questions,
        correct_count=session.correct_count,
        completed_at=session.completed_at,
    )
