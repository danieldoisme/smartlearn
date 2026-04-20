import json
import logging
import random
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Iterable, Sequence
import httpx
from backend.app.config import settings
from backend.app.models.enums import FileType, QuestionType
from backend.app.services.ai_document_parsing import (
    _extract_message_content,
    _post_chat_completions,
    _preview_text,
)
from backend.app.services.document_processing import extract_pages_from_path

logger = logging.getLogger(__name__)
_STOPWORDS = {
    "the",
    "and",
    "for",
    "that",
    "with",
    "this",
    "from",
    "have",
    "into",
    "your",
    "các",
    "những",
    "được",
    "trong",
    "theo",
    "một",
    "này",
    "khi",
    "cho",
    "của",
    "với",
    "tài",
    "liệu",
    "chương",
    "phần",
}
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+|\n+")
_WORD_RE = re.compile(r"[A-Za-zÀ-ỹ0-9][A-Za-zÀ-ỹ0-9_-]{2,}")
_WHITESPACE_RE = re.compile(r"\s+")
_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)
_THINK_TAG_RE = re.compile(r"</?think>", re.IGNORECASE)
_POSITIVE_PASSAGE_PATTERNS = (
    re.compile(
        r"\b(được gọi là|gọi là|là ánh xạ|được phát biểu|quy tắc|định nghĩa|khái niệm|công thức|tính chất|khi đó|suy ra)\b",
        re.IGNORECASE,
    ),
    re.compile(r"^[0-9]+(?:\.[0-9]+)*\.?\s+.+"),
)
_NEGATIVE_PASSAGE_PATTERNS = (
    re.compile(r"\b(ví dụ|lời giải|bài toán|hỏi|chứng minh|bảng)\b", re.IGNORECASE),
)
_LOW_SIGNAL_QUESTION_PATTERNS = (
    re.compile(r"^(theo (đoạn văn|tài liệu)|trong ví dụ|ví dụ)", re.IGNORECASE),
    re.compile(r"\bcó bao nhiêu\b", re.IGNORECASE),
    re.compile(r"\b(hỏi|cho biết)\b", re.IGNORECASE),
)


@dataclass(slots=True)
class Passage:
    id: int
    text: str
    page: int | None = None


@dataclass(slots=True)
class GeneratedQuestionDraft:
    question_type: QuestionType
    content: str
    correct_answer: str | None
    source_text: str
    source_page: int | None
    options: list[dict[str, Any]] = field(default_factory=list)


@dataclass(slots=True)
class QuestionGenerationBundle:
    requested_count: int
    items: list[GeneratedQuestionDraft] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    provider: str = "fallback"
    used_fallback: bool = False


async def generate_questions_for_chapter(
    *,
    chapter_title: str,
    content_text: str,
    question_type: str,
    count: int,
    document_file_path: str | None = None,
    document_file_type: FileType | None = None,
    page_start: int | None = None,
    page_end: int | None = None,
) -> QuestionGenerationBundle:
    warnings: list[str] = []
    passages = _build_candidate_passages(content_text, count)
    if not passages:
        return QuestionGenerationBundle(
            requested_count=count,
            warnings=["Không đủ nội dung có nghĩa để tạo câu hỏi."],
            provider="fallback",
            used_fallback=True,
        )
    if document_file_path and document_file_type is not None:
        passages, page_warnings = _attach_page_numbers(
            passages,
            document_file_path=document_file_path,
            document_file_type=document_file_type,
            page_start=page_start,
            page_end=page_end,
        )
        warnings.extend(page_warnings)
    else:
        warnings.append("Thiếu file gốc nên không thể xác định trang nguồn chính xác.")
    ai_items: list[GeneratedQuestionDraft] = []
    ai_warnings: list[str] = []
    provider = "fallback"
    used_fallback = False
    try:
        ai_items, ai_warnings = await _generate_questions_via_ai(
            chapter_title=chapter_title,
            question_type=question_type,
            count=count,
            passages=passages,
        )
        if ai_items:
            provider = "ai"
    except Exception as exc:  # pragma: no cover - defensive logging path
        logger.warning("AQG AI provider failed for chapter %s: %s", chapter_title, exc)
        ai_warnings.append("AI provider unavailable. Falling back to local generator.")
    warnings.extend(ai_warnings)
    final_items = _dedupe_batch(ai_items)
    if len(final_items) < count:
        used_fallback = True
        fallback_items = _fallback_question_drafts(
            chapter_title=chapter_title,
            content_text=content_text,
            question_type=question_type,
            count=count,
            passages=passages,
        )
        final_items = _merge_unique_items(final_items, fallback_items, limit=count)
        if provider == "ai":
            warnings.append(
                "AI output thiếu hoặc không hợp lệ ở một phần nội dung. Đã bổ sung bằng fallback cục bộ."
            )
    final_items = final_items[:count]
    if provider == "fallback" and final_items:
        used_fallback = True
        warnings.append("Đã dùng fallback cục bộ để bảo đảm tạo câu hỏi.")
    if not any(item.source_page is not None for item in final_items):
        warnings.append(
            "Không xác định được trang nguồn chính xác cho các câu hỏi mới."
        )
    return QuestionGenerationBundle(
        requested_count=count,
        items=final_items,
        warnings=_dedupe_preserve_order(warnings),
        provider=provider,
        used_fallback=used_fallback or provider == "fallback",
    )


def build_questions(
    chapter_title: str, content_text: str, question_type: str, count: int
) -> list[dict[str, Any]]:
    sentences = _extract_sentences(content_text)
    if not sentences:
        return []
    keyword_pool = _build_keyword_pool(sentences)
    if not keyword_pool:
        return []
    cycle = _resolve_types(question_type)
    generated: list[dict[str, Any]] = []
    used_signatures: set[str] = set()
    sentence_index = 0
    max_attempts = max(count * 10, 20)
    attempts = 0
    while len(generated) < count and attempts < max_attempts:
        q_type = cycle[len(generated) % len(cycle)]
        sentence = sentences[sentence_index % len(sentences)]
        sentence_index += 1
        attempts += 1
        question = _generate_one(q_type, sentence, keyword_pool, chapter_title)
        if not question:
            continue
        signature = f"{q_type}:{question['content']}"
        if signature in used_signatures:
            continue
        used_signatures.add(signature)
        generated.append(question)
    return generated


def question_signature(
    *,
    question_type: QuestionType,
    content: str,
    source_text: str | None,
    correct_answer: str | None,
) -> str:
    normalized_content = _normalize_text(content)
    normalized_source = _normalize_text(source_text or "")
    normalized_answer = _normalize_text(correct_answer or "")
    return f"{question_type.value}|{normalized_content}|{normalized_source}|{normalized_answer}"


def filter_existing_questions(
    items: Iterable[GeneratedQuestionDraft], existing_signatures: set[str]
) -> tuple[list[GeneratedQuestionDraft], int]:
    kept: list[GeneratedQuestionDraft] = []
    skipped = 0
    seen = set(existing_signatures)
    for item in items:
        signature = question_signature(
            question_type=item.question_type,
            content=item.content,
            source_text=item.source_text,
            correct_answer=item.correct_answer,
        )
        if signature in seen:
            skipped += 1
            continue
        seen.add(signature)
        kept.append(item)
    return kept, skipped


async def _generate_questions_via_ai(
    *,
    chapter_title: str,
    question_type: str,
    count: int,
    passages: Sequence[Passage],
) -> tuple[list[GeneratedQuestionDraft], list[str]]:
    if not passages:
        return [], ["No passages available for AI generation."]
    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.aqg_model,
        "messages": [
            {"role": "system", "content": _aqg_system_prompt()},
            {
                "role": "user",
                "content": _aqg_user_prompt(
                    chapter_title=chapter_title,
                    question_type=question_type,
                    count=count,
                    passages=passages,
                ),
            },
        ],
        "max_tokens": settings.AQG_MAX_TOKENS,
        "temperature": 0.2,
        "chat_template_kwargs": {"enable_thinking": False},
        "reasoning_format": "none",
        "response_format": _aqg_response_format_schema(),
    }
    async with httpx.AsyncClient(timeout=settings.AQG_TIMEOUT_SECONDS) as client:
        response = await _post_chat_completions(
            client,
            base_url=settings.AI_SERVER_URL,
            headers=headers,
            payload=payload,
        )
        response.raise_for_status()
    message = _extract_message_content(response.json())
    data = _load_json_payload(message)
    if not isinstance(data, dict):
        raise ValueError(
            f"AQG provider returned non-JSON output: {_preview_text(message)}"
        )
    warnings = [
        str(value).strip()
        for value in (data.get("warnings") or [])
        if str(value).strip()
    ]
    passage_map = {passage.id: passage for passage in passages}
    drafts: list[GeneratedQuestionDraft] = []
    for item in data.get("questions") or []:
        normalized = _normalize_ai_question(item, passage_map=passage_map)
        if normalized is not None:
            drafts.append(normalized)
    return _dedupe_batch(drafts), _dedupe_preserve_order(warnings)


def _aqg_system_prompt() -> str:
    return (
        "/nothink\n"
        "You generate high-quality quiz questions from provided passages. "
        "Return JSON only. Never explain. Use only facts explicitly stated in passages. "
        "Prioritize conceptual understanding: definitions, rules, formulas, properties, conditions, relationships, and meanings. "
        "Avoid example-specific trivia, copied wording, sentence-fragment questions, and questions that only ask about numbers or setup details inside an example prompt. "
        "Do not ask about labels like Example, Exercise, Problem, or ask learners to repeat premise wording. "
        "Keep wording concise, natural, and learner-friendly. "
        "Each question must cite one provided source_passage_id."
    )


def _aqg_user_prompt(
    *,
    chapter_title: str,
    question_type: str,
    count: int,
    passages: Sequence[Passage],
) -> str:
    passage_lines = []
    for passage in passages:
        page_label = passage.page if passage.page is not None else "null"
        passage_lines.append(
            f"- id={passage.id}; page={page_label}; text={passage.text}"
        )
    return f"""
Chapter title: {chapter_title}
Requested question type: {question_type}
Requested question count: {count}
Rules:
1. Use only passages below.
2. Every question must include source_passage_id matching one listed passage id.
3. mixed = any combination of mcq, multi, fill.
4. mcq must have exactly 4 options and exactly 1 correct option.
5. multi must have exactly 4 options and at least 2 correct options.
6. fill must have no options and must include short correct_answer.
7. Questions must be answerable directly from cited passage.
8. Prefer knowledge-focused questions about definitions, rules, formulas, meanings, conditions, and concept relationships.
9. Avoid questions that only restate example setup, ask for raw numbers from an example prompt, or test irrelevant wording details.
10. Avoid asking about labels like Ví dụ, Exercise, Problem, or about the wording of the premise itself.
11. Keep language aligned with passage language.
12. Output JSON only.
Passages:
{chr(10).join(passage_lines)}
Output schema:
{{
  "warnings": ["optional warning"],
  "questions": [
    {{
      "question_type": "mcq|multi|fill",
      "content": "question text",
      "correct_answer": "required for fill, optional otherwise",
      "source_passage_id": 1,
      "options": [
        {{"label": "A", "content": "...", "is_correct": true}}
      ]
    }}
  ]
}}
""".strip()


def _aqg_response_format_schema() -> dict[str, Any]:
    return {
        "type": "json_schema",
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "warnings": {
                    "type": "array",
                    "items": {"type": "string", "maxLength": 200},
                    "maxItems": 6,
                },
                "questions": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 50,
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "question_type": {
                                "type": "string",
                                "enum": ["mcq", "multi", "fill"],
                            },
                            "content": {
                                "type": "string",
                                "minLength": 12,
                                "maxLength": 500,
                            },
                            "correct_answer": {
                                "anyOf": [
                                    {"type": "string", "maxLength": 500},
                                    {"type": "null"},
                                ]
                            },
                            "source_passage_id": {"type": "integer", "minimum": 1},
                            "options": {
                                "type": "array",
                                "maxItems": 5,
                                "items": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "properties": {
                                        "label": {
                                            "type": "string",
                                            "minLength": 1,
                                            "maxLength": 2,
                                        },
                                        "content": {
                                            "type": "string",
                                            "minLength": 1,
                                            "maxLength": 500,
                                        },
                                        "is_correct": {"type": "boolean"},
                                    },
                                    "required": ["label", "content", "is_correct"],
                                },
                            },
                        },
                        "required": [
                            "question_type",
                            "content",
                            "correct_answer",
                            "source_passage_id",
                            "options",
                        ],
                    },
                },
            },
            "required": ["warnings", "questions"],
        },
    }


def _normalize_ai_question(
    item: Any, *, passage_map: dict[int, Passage]
) -> GeneratedQuestionDraft | None:
    if not isinstance(item, dict):
        return None
    try:
        question_type = QuestionType(str(item.get("question_type") or "").strip())
    except ValueError:
        return None
    passage = passage_map.get(int(item.get("source_passage_id") or 0))
    if passage is None:
        return None
    content = str(item.get("content") or "").strip()
    if len(content) < 12:
        return None
    raw_options = item.get("options") or []
    options = _normalize_ai_options(raw_options)
    correct_answer = str(item.get("correct_answer") or "").strip() or None
    if _is_low_signal_question(content, passage.text):
        return None
    if question_type == QuestionType.FILL:
        if not correct_answer:
            return None
        options = []
    elif question_type == QuestionType.MCQ:
        if (
            len(options) != 4
            or sum(1 for option in options if option["is_correct"]) != 1
        ):
            return None
        if correct_answer is None:
            correct_answer = next(
                (option["content"] for option in options if option["is_correct"]),
                None,
            )
    elif question_type == QuestionType.MULTI:
        if (
            len(options) != 4
            or sum(1 for option in options if option["is_correct"]) < 2
        ):
            return None
    return GeneratedQuestionDraft(
        question_type=question_type,
        content=content[:500],
        correct_answer=correct_answer[:500] if correct_answer else None,
        source_text=passage.text,
        source_page=passage.page,
        options=options,
    )


def _normalize_ai_options(raw_options: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_options, list):
        return []
    labels = ["A", "B", "C", "D", "E"]
    options: list[dict[str, Any]] = []
    for index, item in enumerate(raw_options[: len(labels)]):
        if not isinstance(item, dict):
            continue
        content = str(item.get("content") or "").strip()
        if not content:
            continue
        label = (
            str(item.get("label") or labels[index]).strip().upper()[:2] or labels[index]
        )
        options.append(
            {
                "label": label,
                "content": content[:500],
                "is_correct": bool(item.get("is_correct")),
            }
        )
    if len(options) >= 4:
        for index, option in enumerate(options[:4]):
            option["label"] = labels[index]
        return options[:4]
    return []


def _fallback_question_drafts(
    *,
    chapter_title: str,
    content_text: str,
    question_type: str,
    count: int,
    passages: Sequence[Passage],
) -> list[GeneratedQuestionDraft]:
    page_map = {_normalize_text(passage.text): passage.page for passage in passages}
    fallback_source = "\n".join(passage.text for passage in passages) or content_text
    drafts: list[GeneratedQuestionDraft] = []
    for item in build_questions(chapter_title, fallback_source, question_type, count):
        source_text = str(item.get("source_text") or "").strip()
        drafts.append(
            GeneratedQuestionDraft(
                question_type=item["question_type"],
                content=str(item.get("content") or "").strip()[:500],
                correct_answer=(str(item.get("correct_answer") or "").strip() or None),
                source_text=source_text,
                source_page=page_map.get(_normalize_text(source_text)),
                options=[dict(option) for option in item.get("options") or []],
            )
        )
    return _dedupe_batch(drafts)


def _build_candidate_passages(content_text: str, count: int) -> list[Passage]:
    sentences = _extract_sentences(content_text)
    if not sentences:
        sentences = _chunk_passages(content_text)
    if not sentences:
        return []

    max_passages = max(6, min(settings.AQG_MAX_PASSAGES, count * 3))
    scored_sentences = [
        (sentence, _passage_priority(sentence)) for sentence in sentences
    ]
    ranked_sentences = sorted(
        scored_sentences,
        key=lambda item: (item[1], -len(item[0])),
        reverse=True,
    )
    preferred_sentences = [
        sentence for sentence, score in ranked_sentences if score >= 2
    ]
    usable_sentences = [sentence for sentence, score in ranked_sentences if score >= 0]
    candidate_sentences = (
        preferred_sentences
        or usable_sentences
        or [sentence for sentence, _score in ranked_sentences]
    )

    selected: list[Passage] = []
    seen: set[str] = set()
    for sentence in candidate_sentences:
        normalized = _normalize_text(sentence)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        selected.append(Passage(id=len(selected) + 1, text=sentence))
        if len(selected) >= max_passages:
            break
    return selected


def _passage_priority(sentence: str) -> int:
    text = sentence.strip()
    lowered = text.lower()
    score = 0

    for pattern in _POSITIVE_PASSAGE_PATTERNS:
        if pattern.search(text):
            score += 3

    for pattern in _NEGATIVE_PASSAGE_PATTERNS:
        if pattern.search(text):
            score -= 5

    if "ví dụ" in lowered or "hỏi có bao nhiêu" in lowered:
        score -= 6
    if any(
        token in lowered
        for token in ("định nghĩa", "khái niệm", "quy tắc", "công thức", "tính chất")
    ):
        score += 4
    if (
        lowered.startswith("ví dụ")
        or lowered.startswith("bài toán")
        or lowered.startswith("lời giải")
    ):
        score -= 4

    digit_count = sum(char.isdigit() for char in text)
    if digit_count >= 6:
        score -= 2
    if 45 <= len(text) <= 220:
        score += 1

    return score


def _is_low_signal_question(content: str, passage_text: str) -> bool:
    lowered = content.strip().lower()
    for pattern in _LOW_SIGNAL_QUESTION_PATTERNS:
        if pattern.search(content):
            return True
    if _passage_priority(passage_text) <= 0 and any(
        token in lowered
        for token in (
            "bao nhiêu",
            "theo đoạn văn",
            "theo tài liệu",
            "trong ví dụ",
            "ví dụ",
        )
    ):
        return True
    return False


def _attach_page_numbers(
    passages: Sequence[Passage],
    *,
    document_file_path: str,
    document_file_type: FileType,
    page_start: int | None,
    page_end: int | None,
) -> tuple[list[Passage], list[str]]:
    pages = extract_pages_from_path(document_file_type, document_file_path)
    if not pages:
        return list(passages), ["Không đọc được file gốc để suy ra trang nguồn."]
    search_start = max((page_start or 1) - 1, 0)
    search_end = min(page_end or len(pages), len(pages))
    scoped_pages = pages[search_start:search_end] or pages
    matched = 0
    enriched: list[Passage] = []
    for passage in passages:
        page = _find_page_for_text(passage.text, scoped_pages)
        if page is not None:
            matched += 1
            page = search_start + page
        enriched.append(Passage(id=passage.id, text=passage.text, page=page))
    warnings: list[str] = []
    if matched == 0:
        warnings.append(
            "Không map được passage về trang PDF/DOCX. Sẽ lưu citation text không kèm trang."
        )
    elif matched < len(passages):
        warnings.append("Một số passage không map được về trang nguồn chính xác.")
    return enriched, warnings


def _find_page_for_text(text: str, pages: Sequence[str]) -> int | None:
    needle = _normalize_text(text)
    if not needle:
        return None
    for index, page in enumerate(pages, start=1):
        haystack = _normalize_text(page)
        if needle and needle in haystack:
            return index
    probe = needle[:120]
    if len(probe) >= 24:
        for index, page in enumerate(pages, start=1):
            haystack = _normalize_text(page)
            if probe in haystack:
                return index
    return None


def _dedupe_batch(
    items: Sequence[GeneratedQuestionDraft],
) -> list[GeneratedQuestionDraft]:
    unique: list[GeneratedQuestionDraft] = []
    seen: set[str] = set()
    for item in items:
        signature = question_signature(
            question_type=item.question_type,
            content=item.content,
            source_text=item.source_text,
            correct_answer=item.correct_answer,
        )
        if signature in seen:
            continue
        seen.add(signature)
        unique.append(item)
    return unique


def _merge_unique_items(
    primary: Sequence[GeneratedQuestionDraft],
    secondary: Sequence[GeneratedQuestionDraft],
    *,
    limit: int,
) -> list[GeneratedQuestionDraft]:
    merged = list(primary)
    seen = {
        question_signature(
            question_type=item.question_type,
            content=item.content,
            source_text=item.source_text,
            correct_answer=item.correct_answer,
        )
        for item in primary
    }
    for item in secondary:
        signature = question_signature(
            question_type=item.question_type,
            content=item.content,
            source_text=item.source_text,
            correct_answer=item.correct_answer,
        )
        if signature in seen:
            continue
        seen.add(signature)
        merged.append(item)
        if len(merged) >= limit:
            break
    return merged


def _extract_sentences(content_text: str) -> list[str]:
    sentences = []
    for raw in _SENTENCE_SPLIT_RE.split(content_text or ""):
        sentence = " ".join(raw.split()).strip()
        if 35 <= len(sentence) <= 320:
            sentences.append(sentence)
    return sentences


def _chunk_passages(content_text: str, max_chars: int = 260) -> list[str]:
    paragraphs = [
        " ".join(part.split()).strip() for part in (content_text or "").split("\n")
    ]
    paragraphs = [paragraph for paragraph in paragraphs if len(paragraph) >= 35]
    if not paragraphs:
        return []
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        candidate = f"{current} {paragraph}".strip()
        if current and len(candidate) > max_chars:
            chunks.append(current)
            current = paragraph
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def _build_keyword_pool(sentences: list[str]) -> list[str]:
    counter: Counter[str] = Counter()
    for sentence in sentences:
        for word in _extract_keywords(sentence):
            counter[word] += 1
    ranked = [
        word for word, _count in counter.most_common() if word.lower() not in _STOPWORDS
    ]
    return ranked[:50]


def _resolve_types(question_type: str) -> list[QuestionType]:
    if question_type == "mixed":
        return [QuestionType.MCQ, QuestionType.MULTI, QuestionType.FILL]
    return [QuestionType(question_type)]


def _generate_one(
    question_type: QuestionType,
    sentence: str,
    keyword_pool: list[str],
    chapter_title: str,
) -> dict[str, Any] | None:
    sentence_keywords = _extract_keywords(sentence)
    if question_type == QuestionType.FILL:
        answer = _pick_keyword(sentence_keywords, keyword_pool)
        if not answer:
            return None
        blanked = _blank_keyword(sentence, answer)
        return {
            "question_type": QuestionType.FILL,
            "content": f'Điền từ còn thiếu trong câu sau: "{blanked}"',
            "correct_answer": answer,
            "source_text": sentence,
            "options": [],
        }
    if question_type == QuestionType.MCQ:
        answer = _pick_keyword(sentence_keywords, keyword_pool)
        if not answer:
            return None
        blanked = _blank_keyword(sentence, answer)
        distractors = _pick_distractors(answer, keyword_pool, 3)
        if len(distractors) < 3:
            distractors.extend(_fallback_words(answer, 3 - len(distractors)))
        choices = [answer, *distractors[:3]]
        random.Random(f"{chapter_title}:{sentence}:{answer}").shuffle(choices)
        return {
            "question_type": QuestionType.MCQ,
            "content": f'Theo tài liệu, từ phù hợp với chỗ trống là gì? "{blanked}"',
            "correct_answer": answer,
            "source_text": sentence,
            "options": _build_options(choices, {answer}),
        }
    correct_terms = (
        sentence_keywords[:2] if len(sentence_keywords) >= 2 else sentence_keywords
    )
    if len(correct_terms) < 2:
        return None
    distractors = _pick_distractors_multi(correct_terms, keyword_pool, 2)
    if len(distractors) < 2:
        distractors.extend(_fallback_words(correct_terms[0], 2 - len(distractors)))
    choices = [*correct_terms[:2], *distractors[:2]]
    random.Random(f"{chapter_title}:{sentence}:multi").shuffle(choices)
    return {
        "question_type": QuestionType.MULTI,
        "content": f'Chọn các từ khóa xuất hiện trong câu sau: "{sentence}"',
        "correct_answer": None,
        "source_text": sentence,
        "options": _build_options(choices, set(correct_terms[:2])),
    }


def _extract_keywords(sentence: str) -> list[str]:
    seen: set[str] = set()
    keywords: list[str] = []
    for match in _WORD_RE.findall(sentence):
        lower = match.lower()
        if lower in _STOPWORDS or lower in seen:
            continue
        seen.add(lower)
        keywords.append(match)
    return keywords


def _pick_keyword(sentence_keywords: list[str], keyword_pool: list[str]) -> str | None:
    for keyword in sentence_keywords:
        if len(keyword) >= 4:
            return keyword
    for keyword in keyword_pool:
        if len(keyword) >= 4:
            return keyword
    return None


def _pick_distractors(answer: str, keyword_pool: list[str], count: int) -> list[str]:
    out: list[str] = []
    answer_lower = answer.lower()
    for keyword in keyword_pool:
        if keyword.lower() == answer_lower:
            continue
        if keyword in out:
            continue
        out.append(keyword)
        if len(out) >= count:
            break
    return out


def _pick_distractors_multi(
    correct_terms: list[str], keyword_pool: list[str], count: int
) -> list[str]:
    correct_lower = {term.lower() for term in correct_terms}
    out: list[str] = []
    for keyword in keyword_pool:
        if keyword.lower() in correct_lower:
            continue
        if keyword in out:
            continue
        out.append(keyword)
        if len(out) >= count:
            break
    return out


def _fallback_words(answer: str, count: int) -> list[str]:
    seeds = ["Khái niệm", "Định nghĩa", "Quy trình", "Thành phần", "Mô hình"]
    out = []
    for seed in seeds:
        if seed.lower() == answer.lower():
            continue
        out.append(seed)
        if len(out) >= count:
            break
    return out


def _blank_keyword(sentence: str, keyword: str) -> str:
    pattern = re.compile(re.escape(keyword), re.IGNORECASE)
    return pattern.sub("_____", sentence, count=1)


def _build_options(
    choices: list[str], correct_values: set[str]
) -> list[dict[str, Any]]:
    labels = ["A", "B", "C", "D", "E"]
    options = []
    for index, choice in enumerate(choices[: len(labels)]):
        options.append(
            {
                "label": labels[index],
                "content": choice,
                "is_correct": choice in correct_values,
            }
        )
    return options


def _normalize_text(value: str) -> str:
    return _WHITESPACE_RE.sub(" ", (value or "").strip()).lower()


def _dedupe_preserve_order(values: Sequence[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        normalized = _normalize_text(value)
        if normalized in seen:
            continue
        seen.add(normalized)
        out.append(value.strip())
    return out


def _load_json_payload(raw: str) -> dict[str, Any] | None:
    text = _THINK_TAG_RE.sub("", raw or "").strip()
    candidates = [text]
    block_match = _JSON_BLOCK_RE.search(text)
    if block_match:
        candidates.insert(0, block_match.group(1).strip())
    balanced = _extract_balanced_json_object(text)
    if balanced:
        candidates.insert(0, balanced)
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except Exception:
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


def _extract_balanced_json_object(text: str) -> str | None:
    starts = [index for index, char in enumerate(text) if char == "{"]
    for start in starts:
        depth = 0
        in_string = False
        escape = False
        for index in range(start, len(text)):
            char = text[index]
            if in_string:
                if escape:
                    escape = False
                elif char == "\\":
                    escape = True
                elif char == '"':
                    in_string = False
                continue
            if char == '"':
                in_string = True
                continue
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return text[start : index + 1].strip()
    return None
