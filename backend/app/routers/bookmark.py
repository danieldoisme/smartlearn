from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.content import Chapter, Document
from backend.app.models.interaction import Bookmark, Note
from backend.app.models.quiz import Question
from backend.app.models.user import User
from backend.app.schemas.interaction import (
    BookmarkCreate,
    BookmarkOut,
    NoteCreate,
    NoteOut,
    NoteUpdate,
)

router = APIRouter(tags=["interaction"])


async def _resolve_bookmark_context(
    db: AsyncSession, bookmark: Bookmark, user_id: int
) -> dict:
    ctx: dict = {
        "question_content": None,
        "chapter_title": None,
        "document_id": None,
        "document_title": None,
    }

    chapter_id = bookmark.chapter_id
    if bookmark.question_id is not None:
        row = (
            await db.execute(
                select(Question.content, Question.chapter_id)
                .join(Chapter, Chapter.id == Question.chapter_id)
                .join(Document, Document.id == Chapter.document_id)
                .where(Question.id == bookmark.question_id)
                .where(Document.user_id == user_id)
            )
        ).first()
        if row is not None:
            ctx["question_content"] = row[0]
            chapter_id = chapter_id or row[1]

    if chapter_id is not None:
        row = (
            await db.execute(
                select(Chapter.title, Document.id, Document.title, Document.user_id)
                .join(Document, Document.id == Chapter.document_id)
                .where(Chapter.id == chapter_id)
            )
        ).first()
        if row is not None:
            ch_title, doc_id, doc_title, doc_user_id = row
            if doc_user_id == user_id:
                ctx["chapter_title"] = ch_title
                ctx["document_id"] = doc_id
                ctx["document_title"] = doc_title
    return ctx


def _bookmark_out(bm: Bookmark, ctx: dict) -> BookmarkOut:
    return BookmarkOut(
        id=bm.id,
        user_id=bm.user_id,
        question_id=bm.question_id,
        chapter_id=bm.chapter_id,
        page_number=bm.page_number,
        created_at=bm.created_at,
        **ctx,
    )


@router.get("/bookmarks", response_model=List[BookmarkOut])
async def list_bookmarks(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        (
            await db.execute(
                select(Bookmark)
                .where(Bookmark.user_id == current.id)
                .order_by(Bookmark.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    out: List[BookmarkOut] = []
    for bm in rows:
        ctx = await _resolve_bookmark_context(db, bm, current.id)
        out.append(_bookmark_out(bm, ctx))
    return out


@router.post(
    "/bookmarks", response_model=BookmarkOut, status_code=status.HTTP_201_CREATED
)
async def create_bookmark(
    payload: BookmarkCreate,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if (
        payload.question_id is None
        and payload.chapter_id is None
        and payload.page_number is None
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Bookmark requires question_id, chapter_id, or page_number",
        )

    if payload.question_id is not None:
        q = (
            await db.execute(
                select(Question.chapter_id)
                .join(Chapter, Chapter.id == Question.chapter_id)
                .join(Document, Document.id == Chapter.document_id)
                .where(Question.id == payload.question_id)
                .where(Document.user_id == current.id)
            )
        ).first()
        if q is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")

    if payload.chapter_id is not None:
        ch = (
            await db.execute(
                select(Chapter.id)
                .join(Document, Document.id == Chapter.document_id)
                .where(Chapter.id == payload.chapter_id)
                .where(Document.user_id == current.id)
            )
        ).first()
        if ch is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Chapter not found")

    bm = Bookmark(
        user_id=current.id,
        question_id=payload.question_id,
        chapter_id=payload.chapter_id,
        page_number=payload.page_number,
    )
    db.add(bm)
    await db.commit()
    await db.refresh(bm)
    ctx = await _resolve_bookmark_context(db, bm, current.id)
    return _bookmark_out(bm, ctx)


@router.delete("/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(
    bookmark_id: int,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bm = (
        await db.execute(
            select(Bookmark)
            .where(Bookmark.id == bookmark_id)
            .where(Bookmark.user_id == current.id)
        )
    ).scalar_one_or_none()
    if bm is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bookmark not found")

    notes = (
        (
            await db.execute(
                select(Note)
                .where(Note.bookmark_id == bm.id)
                .where(Note.user_id == current.id)
            )
        )
        .scalars()
        .all()
    )
    for n in notes:
        n.bookmark_id = None

    await db.delete(bm)
    await db.commit()
    return None


async def _resolve_note_context(db: AsyncSession, note: Note, user_id: int) -> dict:
    ctx: dict = {
        "question_content": None,
        "page_number": None,
        "document_title": None,
    }

    chapter_id = None
    if note.question_id is not None:
        row = (
            await db.execute(
                select(Question.content, Question.chapter_id)
                .join(Chapter, Chapter.id == Question.chapter_id)
                .join(Document, Document.id == Chapter.document_id)
                .where(Question.id == note.question_id)
                .where(Document.user_id == user_id)
            )
        ).first()
        if row is not None:
            ctx["question_content"] = row[0]
            chapter_id = row[1]

    if note.bookmark_id is not None:
        bm = (
            await db.execute(
                select(Bookmark)
                .where(Bookmark.id == note.bookmark_id)
                .where(Bookmark.user_id == user_id)
            )
        ).scalar_one_or_none()
        if bm is not None:
            ctx["page_number"] = bm.page_number
            chapter_id = chapter_id or bm.chapter_id

    if chapter_id is not None:
        row = (
            await db.execute(
                select(Document.title, Document.user_id)
                .join(Chapter, Chapter.document_id == Document.id)
                .where(Chapter.id == chapter_id)
            )
        ).first()
        if row is not None and row[1] == user_id:
            ctx["document_title"] = row[0]
    return ctx


def _note_out(note: Note, ctx: dict) -> NoteOut:
    return NoteOut(
        id=note.id,
        user_id=note.user_id,
        bookmark_id=note.bookmark_id,
        question_id=note.question_id,
        content=note.content,
        created_at=note.created_at,
        updated_at=note.updated_at,
        **ctx,
    )


@router.get("/notes", response_model=List[NoteOut])
async def list_notes(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        (
            await db.execute(
                select(Note)
                .where(Note.user_id == current.id)
                .order_by(Note.updated_at.desc())
            )
        )
        .scalars()
        .all()
    )
    out: List[NoteOut] = []
    for n in rows:
        ctx = await _resolve_note_context(db, n, current.id)
        out.append(_note_out(n, ctx))
    return out


@router.post("/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreate,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.bookmark_id is not None:
        bm = (
            await db.execute(
                select(Bookmark)
                .where(Bookmark.id == payload.bookmark_id)
                .where(Bookmark.user_id == current.id)
            )
        ).scalar_one_or_none()
        if bm is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Bookmark not found")

    if payload.question_id is not None:
        q = (
            await db.execute(
                select(Question.id)
                .join(Chapter, Chapter.id == Question.chapter_id)
                .join(Document, Document.id == Chapter.document_id)
                .where(Question.id == payload.question_id)
                .where(Document.user_id == current.id)
            )
        ).first()
        if q is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")

    note = Note(
        user_id=current.id,
        bookmark_id=payload.bookmark_id,
        question_id=payload.question_id,
        content=payload.content,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    ctx = await _resolve_note_context(db, note, current.id)
    return _note_out(note, ctx)


@router.patch("/notes/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: int,
    payload: NoteUpdate,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = (
        await db.execute(
            select(Note).where(Note.id == note_id).where(Note.user_id == current.id)
        )
    ).scalar_one_or_none()
    if note is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")

    note.content = payload.content
    await db.commit()
    await db.refresh(note)
    ctx = await _resolve_note_context(db, note, current.id)
    return _note_out(note, ctx)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = (
        await db.execute(
            select(Note).where(Note.id == note_id).where(Note.user_id == current.id)
        )
    ).scalar_one_or_none()
    if note is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")
    await db.delete(note)
    await db.commit()
    return None
