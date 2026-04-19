from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.deps import get_current_user, get_db
from backend.app.models.content import Chapter, Document, Topic
from backend.app.models.interaction import Bookmark, Note
from backend.app.models.quiz import (
    Exam,
    ExamQuestion,
    Question,
    QuestionOption,
    StudySession,
    UserAnswer,
)
from backend.app.services.document_processing import (
    MAX_UPLOAD_BYTES,
    decode_base64_payload,
    detect_file_type,
    parse_document,
    store_uploaded_file,
)
from backend.app.services.question_generation import build_questions
from backend.app.models.user import User
from backend.app.schemas.document import (
    ChapterWithStats,
    DocumentOut,
    DocumentPreviewOut,
    DocumentPreviewSection,
    DocumentUploadIn,
    DocumentDetailOut,
    DocumentStructureUpdateIn,
    DocumentUpdateIn,
    LibraryDocumentOut,
)
from backend.app.schemas.quiz import QuestionGenerationIn, QuestionGenerationOut
from backend.app.schemas.topic import TopicCreate, TopicOut

router = APIRouter(tags=["library"])


async def _resolve_topic(
    db: AsyncSession, user_id: int, topic_id: Optional[int], topic_name: Optional[str]
) -> Optional[int]:
    normalized_name = (topic_name or "").strip()
    if topic_id is not None:
        topic = (
            await db.execute(
                select(Topic)
                .where(Topic.id == topic_id)
                .where(Topic.user_id == user_id)
            )
        ).scalar_one_or_none()
        if topic is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Topic not found")
        return topic.id

    if not normalized_name:
        return None

    existing = (
        await db.execute(
            select(Topic)
            .where(Topic.user_id == user_id)
            .where(func.lower(Topic.name) == normalized_name.lower())
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing.id

    topic = Topic(user_id=user_id, name=normalized_name[:100])
    db.add(topic)
    await db.flush()
    return topic.id


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


@router.post("/topics", response_model=TopicOut, status_code=status.HTTP_201_CREATED)
async def create_topic(
    payload: TopicCreate,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    name = payload.name.strip()
    existing = (
        await db.execute(
            select(Topic)
            .where(Topic.user_id == current.id)
            .where(func.lower(Topic.name) == name.lower())
        )
    ).scalar_one_or_none()
    if existing is not None:
        return TopicOut.model_validate(existing)

    topic = Topic(user_id=current.id, name=name)
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return TopicOut.model_validate(topic)


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: int,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    topic = (
        await db.execute(
            select(Topic).where(Topic.id == topic_id).where(Topic.user_id == current.id)
        )
    ).scalar_one_or_none()

    if topic is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topic not found")

    doc_count = (
        await db.execute(
            select(func.count(Document.id)).where(Document.topic_id == topic_id)
        )
    ).scalar_one()

    if doc_count > 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Không thể xóa chủ đề đang chứa tài liệu. Vui lòng xóa tài liệu trước.",
        )

    await db.delete(topic)
    await db.commit()
    return None


def _decode_upload(payload: DocumentUploadIn):
    try:
        file_bytes = decode_base64_payload(payload.file_content_base64)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid file payload")

    if not file_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File is empty")

    if len(file_bytes) > MAX_UPLOAD_BYTES:
        mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Kích thước file vượt quá giới hạn {mb} MB",
        )

    try:
        file_type = detect_file_type(payload.file_name)
    except ValueError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Chỉ hỗ trợ file PDF hoặc DOCX"
        )

    title = (
        (payload.title or "").strip()
        or payload.file_name.rsplit(".", 1)[0].strip()
        or payload.file_name
    )
    return file_bytes, file_type, title


@router.post("/documents/preview", response_model=DocumentPreviewOut)
async def preview_document(
    payload: DocumentUploadIn,
    current: User = Depends(get_current_user),
):
    file_bytes, file_type, title = _decode_upload(payload)
    parsed = await parse_document(file_type, file_bytes, title)
    preview_sections = [
        DocumentPreviewSection(
            title=(section.get("title") or f"Phần {index}")[:255],
            content_text=(section.get("content_text") or "")[:400],
            page_start=section.get("page_start"),
            page_end=section.get("page_end"),
            content_chars=len(section.get("content_text") or ""),
        )
        for index, section in enumerate(parsed.sections, start=1)
    ]
    total_chars = sum(sec.content_chars for sec in preview_sections)
    return DocumentPreviewOut(
        file_name=payload.file_name,
        file_type=file_type,
        file_size=len(file_bytes),
        title=title[:255],
        chapter_count=len(preview_sections),
        total_chars=total_chars,
        sections=preview_sections,
        parser_mode=parsed.parser_mode,
        review_required=parsed.review_required,
        confidence=parsed.confidence,
        warnings=parsed.warnings,
    )


@router.post(
    "/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED
)
async def create_document(
    payload: DocumentUploadIn,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    file_bytes, file_type, title = _decode_upload(payload)

    topic_id = await _resolve_topic(
        db, current.id, payload.topic_id, payload.topic_name
    )

    stored_path = store_uploaded_file(current.id, payload.file_name, file_bytes)
    if payload.chapters:
        sections = [
            {
                "title": chapter.title,
                "content_text": chapter.content_text,
                "page_start": chapter.page_start,
                "page_end": chapter.page_end,
            }
            for chapter in payload.chapters
        ]
    else:
        parsed = await parse_document(file_type, file_bytes, title)
        sections = parsed.sections

    document = Document(
        user_id=current.id,
        topic_id=topic_id,
        title=title[:255],
        file_path=stored_path,
        file_type=file_type,
        file_size=len(file_bytes),
    )
    db.add(document)
    await db.flush()

    for index, section in enumerate(sections, start=1):
        db.add(
            Chapter(
                document_id=document.id,
                title=(section["title"] or f"Phần {index}")[:255],
                order_index=index,
                content_text=section["content_text"],
                page_start=section.get("page_start"),
                page_end=section.get("page_end"),
            )
        )

    await db.commit()
    await db.refresh(document)
    return DocumentOut.model_validate(document)


@router.patch("/documents/{document_id}", response_model=DocumentOut)
async def update_document(
    document_id: int,
    payload: DocumentUpdateIn,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = (
        await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.user_id == current.id)
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    data = payload.model_dump(exclude_unset=True)
    if "title" in data:
        doc.title = data["title"].strip()
    if "topic_id" in data:
        topic_id = data["topic_id"]
        if topic_id is None:
            doc.topic_id = None
        else:
            topic = (
                await db.execute(
                    select(Topic)
                    .where(Topic.id == topic_id)
                    .where(Topic.user_id == current.id)
                )
            ).scalar_one_or_none()
            if topic is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Topic not found")
            doc.topic_id = topic.id
    await db.commit()
    await db.refresh(doc)
    return DocumentOut.model_validate(doc)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = (
        await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.user_id == current.id)
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    chapter_ids = [
        row[0]
        for row in (
            await db.execute(select(Chapter.id).where(Chapter.document_id == doc.id))
        ).all()
    ]
    question_ids: list[int] = []
    if chapter_ids:
        question_ids = [
            row[0]
            for row in (
                await db.execute(
                    select(Question.id).where(Question.chapter_id.in_(chapter_ids))
                )
            ).all()
        ]

    bookmark_ids: list[int] = []
    if chapter_ids or question_ids:
        bookmark_filters = []
        if chapter_ids:
            bookmark_filters.append(Bookmark.chapter_id.in_(chapter_ids))
        if question_ids:
            bookmark_filters.append(Bookmark.question_id.in_(question_ids))
        bookmark_rows = (
            await db.execute(
                select(Bookmark.id).where(
                    Bookmark.user_id == current.id,
                    or_(*bookmark_filters),
                )
            )
        ).all()
        bookmark_ids = [row[0] for row in bookmark_rows]

    if bookmark_ids:
        await db.execute(delete(Note).where(Note.bookmark_id.in_(bookmark_ids)))
        await db.execute(delete(Bookmark).where(Bookmark.id.in_(bookmark_ids)))

    if question_ids:
        await db.execute(delete(Note).where(Note.question_id.in_(question_ids)))
        await db.execute(
            delete(UserAnswer).where(UserAnswer.question_id.in_(question_ids))
        )
        exam_ids = [
            row[0]
            for row in (
                await db.execute(
                    select(ExamQuestion.exam_id)
                    .where(ExamQuestion.question_id.in_(question_ids))
                    .group_by(ExamQuestion.exam_id)
                )
            ).all()
        ]
        await db.execute(
            delete(ExamQuestion).where(ExamQuestion.question_id.in_(question_ids))
        )
        if exam_ids:
            remaining_exam_ids = {
                row[0]
                for row in (
                    await db.execute(
                        select(ExamQuestion.exam_id)
                        .where(ExamQuestion.exam_id.in_(exam_ids))
                        .group_by(ExamQuestion.exam_id)
                    )
                ).all()
            }
            deletable_exam_ids = [
                exam_id for exam_id in exam_ids if exam_id not in remaining_exam_ids
            ]
            if deletable_exam_ids:
                await db.execute(delete(Exam).where(Exam.id.in_(deletable_exam_ids)))

        await db.execute(
            delete(QuestionOption).where(QuestionOption.question_id.in_(question_ids))
        )
        await db.execute(delete(Question).where(Question.id.in_(question_ids)))

    if chapter_ids:
        await db.execute(
            delete(StudySession).where(StudySession.chapter_id.in_(chapter_ids))
        )
        await db.execute(delete(Chapter).where(Chapter.id.in_(chapter_ids)))

    await db.delete(doc)
    await db.commit()
    return None


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


@router.get("/documents/{document_id}", response_model=DocumentDetailOut)
async def get_document_detail(
    document_id: int,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = (
        await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.user_id == current.id)
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    topic_name = None
    if doc.topic_id is not None:
        topic_name = (
            await db.execute(select(Topic.name).where(Topic.id == doc.topic_id))
        ).scalar_one_or_none()

    chapters = (
        (
            await db.execute(
                select(Chapter)
                .where(Chapter.document_id == doc.id)
                .order_by(Chapter.order_index)
            )
        )
        .scalars()
        .all()
    )
    chapter_ids = [c.id for c in chapters]

    q_count_map: dict[int, int] = {}
    if chapter_ids:
        rows = (
            await db.execute(
                select(Question.chapter_id, func.count(Question.id))
                .where(Question.chapter_id.in_(chapter_ids))
                .group_by(Question.chapter_id)
            )
        ).all()
        q_count_map = {row[0]: row[1] for row in rows}

    answered_map: dict[int, tuple[int, int, int]] = {}
    if chapter_ids:
        rows = (
            await db.execute(
                select(
                    Question.chapter_id,
                    func.count(func.distinct(UserAnswer.question_id)),
                    func.sum(func.if_(UserAnswer.is_correct, 1, 0)),
                    func.count(UserAnswer.id),
                )
                .join(UserAnswer, UserAnswer.question_id == Question.id)
                .where(Question.chapter_id.in_(chapter_ids))
                .where(UserAnswer.user_id == current.id)
                .group_by(Question.chapter_id)
            )
        ).all()
        answered_map = {
            row[0]: (int(row[1] or 0), int(row[2] or 0), int(row[3] or 0))
            for row in rows
        }

    chapter_out: list[ChapterWithStats] = []
    total_questions = 0
    total_answered = 0
    for c in chapters:
        q_count = q_count_map.get(c.id, 0)
        answered, correct, attempts = answered_map.get(c.id, (0, 0, 0))
        accuracy = int(round(correct / attempts * 100)) if attempts else 0
        total_questions += q_count
        total_answered += answered
        chapter_out.append(
            ChapterWithStats(
                id=c.id,
                document_id=c.document_id,
                title=c.title,
                order_index=c.order_index,
                content_text=c.content_text,
                page_start=c.page_start,
                page_end=c.page_end,
                question_count=q_count,
                answered_count=answered,
                correct_count=correct,
                accuracy=accuracy,
            )
        )

    progress = (
        int(round(total_answered / total_questions * 100)) if total_questions else 0
    )
    return DocumentDetailOut(
        id=doc.id,
        user_id=doc.user_id,
        topic_id=doc.topic_id,
        title=doc.title,
        file_path=doc.file_path,
        file_type=doc.file_type,
        file_size=doc.file_size,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        topic_name=topic_name,
        chapter_count=len(chapters),
        question_count=total_questions,
        progress=progress,
        chapters=chapter_out,
        total_questions=total_questions,
        total_answered=total_answered,
    )


@router.put("/documents/{document_id}/structure", response_model=DocumentDetailOut)
async def update_document_structure(
    document_id: int,
    payload: DocumentStructureUpdateIn,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = (
        await db.execute(
            select(Document)
            .where(Document.id == document_id)
            .where(Document.user_id == current.id)
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    question_count = (
        await db.execute(
            select(func.count(Question.id))
            .join(Chapter, Chapter.id == Question.chapter_id)
            .where(Chapter.document_id == doc.id)
        )
    ).scalar_one()
    if question_count:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Không thể chỉnh cấu trúc sau khi đã tạo câu hỏi. Hãy xóa câu hỏi trước.",
        )

    existing_chapters = (
        (
            await db.execute(
                select(Chapter)
                .where(Chapter.document_id == doc.id)
                .order_by(Chapter.order_index)
            )
        )
        .scalars()
        .all()
    )
    for chapter in existing_chapters:
        await db.delete(chapter)
    await db.flush()

    for index, item in enumerate(payload.chapters, start=1):
        db.add(
            Chapter(
                document_id=doc.id,
                title=item.title.strip(),
                order_index=index,
                content_text=item.content_text.strip(),
                page_start=item.page_start,
                page_end=item.page_end,
            )
        )

    await db.commit()
    return await get_document_detail(document_id, current, db)


@router.post(
    "/chapters/{chapter_id}/generate-questions",
    response_model=QuestionGenerationOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_questions(
    chapter_id: int,
    payload: QuestionGenerationIn,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chapter = (
        await db.execute(
            select(Chapter)
            .join(Document, Document.id == Chapter.document_id)
            .where(Chapter.id == chapter_id)
            .where(Document.user_id == current.id)
        )
    ).scalar_one_or_none()
    if chapter is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chapter not found")

    generated = build_questions(
        chapter.title, chapter.content_text, payload.question_type, payload.count
    )
    if not generated:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Không đủ nội dung để tạo câu hỏi cho chương này",
        )

    created_count = 0
    for item in generated:
        question = Question(
            chapter_id=chapter.id,
            question_type=item["question_type"],
            content=item["content"],
            correct_answer=item["correct_answer"],
            source_text=item["source_text"],
            source_page=chapter.page_start,
        )
        db.add(question)
        await db.flush()

        for option in item["options"]:
            db.add(
                QuestionOption(
                    question_id=question.id,
                    label=option["label"],
                    content=option["content"][:500],
                    is_correct=option["is_correct"],
                )
            )
        created_count += 1

    await db.commit()
    return QuestionGenerationOut(chapter_id=chapter.id, created_count=created_count)
