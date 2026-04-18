import random
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.content import Chapter, Document
from backend.app.models.enums import SessionType
from backend.app.models.quiz import (
    Exam,
    ExamQuestion,
    Question,
    StudySession,
    UserAnswer,
)
from backend.app.models.user import User
from backend.app.routers.study import _build_source_context, _grade, _to_question_out
from backend.app.schemas.quiz import (
    ExamProgressIn,
    ExamResultItem,
    ExamResultOut,
    ExamSessionOut,
    ExamStart,
    ExamStartOut,
    ExamSubmit,
)

router = APIRouter(prefix="/exams", tags=["exams"])


async def _own_exam(db: AsyncSession, exam_id: int, user_id: int) -> Exam:
    row = await db.execute(
        select(Exam).where(Exam.id == exam_id).where(Exam.user_id == user_id)
    )
    exam = row.scalar_one_or_none()
    if exam is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")
    return exam


async def _pick_question_ids(
    db: AsyncSession,
    user_id: int,
    chapter_id: Optional[int],
    chapter_ids: list[int],
    question_type,
    limit: int,
) -> List[int]:
    q = (
        select(Question.id)
        .join(Chapter, Chapter.id == Question.chapter_id)
        .join(Document, Document.id == Chapter.document_id)
        .where(Document.user_id == user_id)
    )
    if chapter_ids:
        q = q.where(Question.chapter_id.in_(chapter_ids))
    elif chapter_id is not None:
        q = q.where(Question.chapter_id == chapter_id)
    if question_type is not None:
        q = q.where(Question.question_type == question_type)
    ids = [r[0] for r in (await db.execute(q)).all()]
    if not ids:
        return []
    if len(ids) <= limit:
        random.shuffle(ids)
        return ids
    return random.sample(ids, limit)


@router.post("", response_model=ExamStartOut)
async def start_exam(
    payload: ExamStart,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.chapter_id is not None:
        # Validate chapter ownership via Document.user_id
        row = await db.execute(
            select(Chapter.id)
            .join(Document, Document.id == Chapter.document_id)
            .where(Chapter.id == payload.chapter_id)
            .where(Document.user_id == current.id)
        )
        if row.scalar_one_or_none() is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Chapter not found")
    chapter_ids = [
        chapter_id for chapter_id in payload.chapter_ids if isinstance(chapter_id, int)
    ]
    if chapter_ids:
        rows = (
            await db.execute(
                select(Chapter.id)
                .join(Document, Document.id == Chapter.document_id)
                .where(Chapter.id.in_(chapter_ids))
                .where(Document.user_id == current.id)
            )
        ).all()
        if len({row[0] for row in rows}) != len(set(chapter_ids)):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Một số chương không hợp lệ")

    question_ids = await _pick_question_ids(
        db,
        current.id,
        payload.chapter_id,
        chapter_ids,
        payload.question_type,
        payload.question_limit,
    )
    if not question_ids:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Không có câu hỏi khả dụng cho bài kiểm tra"
        )

    questions = (
        (
            await db.execute(
                select(Question)
                .options(
                    selectinload(Question.options),
                    selectinload(Question.chapter).selectinload(Chapter.document),
                )
                .where(Question.id.in_(question_ids))
            )
        )
        .scalars()
        .all()
    )
    q_by_id = {q.id: q for q in questions}
    ordered = [q_by_id[qid] for qid in question_ids if qid in q_by_id]

    exam = Exam(
        user_id=current.id,
        time_limit_minutes=payload.time_limit_minutes,
        total_questions=len(ordered),
    )
    db.add(exam)
    await db.flush()

    for i, q in enumerate(ordered, start=1):
        db.add(
            ExamQuestion(
                exam_id=exam.id,
                question_id=q.id,
                order_index=i,
            )
        )
    await db.commit()
    await db.refresh(exam)

    return ExamStartOut(
        exam_id=exam.id,
        time_limit_minutes=exam.time_limit_minutes,
        total_questions=exam.total_questions,
        started_at=exam.started_at,
        questions=[_to_question_out(q) for q in ordered],
    )


@router.get("/current", response_model=ExamSessionOut | None)
async def get_current_exam(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exam = (
        await db.execute(
            select(Exam)
            .where(Exam.user_id == current.id)
            .where(Exam.completed_at.is_(None))
            .order_by(Exam.started_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if exam is None:
        return None
    items = await _load_exam_items(db, exam.id)
    return _to_exam_session(exam, items)


@router.patch("/{exam_id}/progress", response_model=ExamSessionOut)
async def save_exam_progress(
    exam_id: int,
    payload: ExamProgressIn,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exam = await _own_exam(db, exam_id, current.id)
    if exam.completed_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Exam already completed")

    items = await _load_exam_items(db, exam.id)
    answer_map = payload.answers or {}
    for eq, q in items:
        selected = answer_map.get(q.id)
        if selected is None:
            selected = answer_map.get(str(q.id))
        eq.selected_answer = selected or None
    exam.is_paused = payload.is_paused
    await db.commit()
    await db.refresh(exam)
    items = await _load_exam_items(db, exam.id)
    return _to_exam_session(exam, items)


async def _load_exam_items(
    db: AsyncSession, exam_id: int
) -> List[tuple[ExamQuestion, Question]]:
    rows = (
        await db.execute(
            select(ExamQuestion, Question)
            .join(Question, Question.id == ExamQuestion.question_id)
            .options(
                selectinload(Question.options),
                selectinload(Question.chapter).selectinload(Chapter.document),
            )
            .where(ExamQuestion.exam_id == exam_id)
            .order_by(ExamQuestion.order_index)
        )
    ).all()
    return [(eq, q) for eq, q in rows]


def _to_exam_session(
    exam: Exam, items: List[tuple[ExamQuestion, Question]]
) -> ExamSessionOut:
    return ExamSessionOut(
        exam_id=exam.id,
        time_limit_minutes=exam.time_limit_minutes,
        total_questions=exam.total_questions,
        started_at=exam.started_at,
        is_paused=exam.is_paused,
        questions=[_to_question_out(q) for _eq, q in items],
        answers={
            q.id: eq.selected_answer
            for eq, q in items
            if eq.selected_answer is not None
        },
    )


def _build_results(items: List[tuple[ExamQuestion, Question]]) -> List[ExamResultItem]:
    out: List[ExamResultItem] = []
    for eq, q in items:
        chapter = getattr(q, "chapter", None)
        document = getattr(chapter, "document", None) if chapter is not None else None
        if q.question_type.value == "fill":
            correct_answer = q.correct_answer
        else:
            correct_answer = ",".join(
                sorted(o.label for o in q.options if o.is_correct)
            )
        out.append(
            ExamResultItem(
                question_id=q.id,
                order_index=eq.order_index,
                content=q.content,
                question_type=q.question_type,
                chapter_id=q.chapter_id,
                chapter_title=chapter.title if chapter is not None else None,
                document_id=document.id if document is not None else None,
                document_title=document.title if document is not None else None,
                selected_answer=eq.selected_answer,
                correct_answer=correct_answer,
                is_correct=bool(eq.is_correct),
                is_skipped=eq.selected_answer is None,
                source_text=q.source_text,
                source_context=_build_source_context(
                    chapter.content_text if chapter is not None else None,
                    q.source_text,
                ),
                source_page=q.source_page,
            )
        )
    return out


def _summary(results: List[ExamResultItem]) -> tuple[int, int, int]:
    correct = sum(1 for r in results if r.is_correct)
    skipped = sum(1 for r in results if r.is_skipped)
    wrong = len(results) - correct - skipped
    return correct, wrong, skipped


@router.post("/{exam_id}/submit", response_model=ExamResultOut)
async def submit_exam(
    exam_id: int,
    payload: ExamSubmit,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exam = await _own_exam(db, exam_id, current.id)
    if exam.completed_at is not None:
        items = await _load_exam_items(db, exam.id)
        results = _build_results(items)
        correct, wrong, skipped = _summary(results)
        return ExamResultOut(
            exam_id=exam.id,
            score=float(exam.score or 0),
            correct_count=correct,
            wrong_count=wrong,
            skipped_count=skipped,
            total_questions=exam.total_questions,
            time_limit_minutes=exam.time_limit_minutes,
            started_at=exam.started_at,
            completed_at=exam.completed_at,
            results=results,
        )

    items = await _load_exam_items(db, exam.id)
    if not items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Exam has no questions")

    # Group session per unique chapter touched so answers feed progress/review
    chapter_to_session: dict[int, StudySession] = {}

    correct_count = 0
    for eq, q in items:
        selected = payload.answers.get(q.id)
        if selected is None or selected == "":
            eq.selected_answer = None
            eq.is_correct = False
            is_skipped = True
        else:
            is_correct, _ca, _cl = _grade(q, selected)
            eq.selected_answer = selected
            eq.is_correct = is_correct
            is_skipped = False
            if is_correct:
                correct_count += 1

        # Mirror into UserAnswer via a per-chapter StudySession
        sess = chapter_to_session.get(q.chapter_id)
        if sess is None:
            sess = StudySession(
                user_id=current.id,
                chapter_id=q.chapter_id,
                session_type=SessionType.REVIEW,
                total_questions=0,
                correct_count=0,
            )
            db.add(sess)
            await db.flush()
            chapter_to_session[q.chapter_id] = sess

        db.add(
            UserAnswer(
                session_id=sess.id,
                question_id=q.id,
                user_id=current.id,
                selected_answer=eq.selected_answer,
                is_correct=bool(eq.is_correct),
                is_skipped=is_skipped,
            )
        )
        sess.total_questions += 1
        if eq.is_correct:
            sess.correct_count += 1

    total = exam.total_questions or len(items)
    score = round((correct_count / total) * 100, 2) if total else 0.0
    exam.correct_count = correct_count
    exam.score = score
    exam.completed_at = datetime.now(timezone.utc)

    for sess in chapter_to_session.values():
        sess.completed_at = exam.completed_at

    await db.commit()

    # Re-load for response with freshly persisted values
    items = await _load_exam_items(db, exam.id)
    results = _build_results(items)
    correct, wrong, skipped = _summary(results)
    await db.refresh(exam)

    return ExamResultOut(
        exam_id=exam.id,
        score=float(exam.score or 0),
        correct_count=correct,
        wrong_count=wrong,
        skipped_count=skipped,
        total_questions=exam.total_questions,
        time_limit_minutes=exam.time_limit_minutes,
        started_at=exam.started_at,
        completed_at=exam.completed_at,
        results=results,
    )


@router.get("/{exam_id}/result", response_model=ExamResultOut)
async def get_exam_result(
    exam_id: int,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exam = await _own_exam(db, exam_id, current.id)
    if exam.completed_at is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not completed")

    items = await _load_exam_items(db, exam.id)
    results = _build_results(items)
    correct, wrong, skipped = _summary(results)

    return ExamResultOut(
        exam_id=exam.id,
        score=float(exam.score or 0),
        correct_count=correct,
        wrong_count=wrong,
        skipped_count=skipped,
        total_questions=exam.total_questions,
        time_limit_minutes=exam.time_limit_minutes,
        started_at=exam.started_at,
        completed_at=exam.completed_at,
        results=results,
    )
