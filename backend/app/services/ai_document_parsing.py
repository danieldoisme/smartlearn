import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

import httpx

from backend.app.config import settings
from backend.app.models.enums import FileType
from backend.app.services.text_cleaning import (
    chapter_marker,
    detect_toc_pages,
    is_heading_line,
)

_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)
_THINK_BLOCK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
logger = logging.getLogger(__name__)

_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


@dataclass
class AISectionBoundary:
    title: str
    page_start: int | None = None
    page_end: int | None = None
    start_anchor: str = ""
    end_anchor: str = ""


@dataclass
class AIStructureSuggestion:
    sections: list[AISectionBoundary]
    confidence: float | None = None
    review_required: bool = False
    warnings: list[str] = field(default_factory=list)


@dataclass
class AIParseOutcome:
    suggestion: AIStructureSuggestion | None = None
    diagnostics: list[str] = field(default_factory=list)


async def infer_document_structure(
    *,
    file_type: FileType,
    document_title: str,
    pages: list[str],
) -> AIParseOutcome:
    if not pages:
        return AIParseOutcome(diagnostics=["No pages extracted for AI parser"])

    if settings.AI_PARSER_LONGDOC_MODE:
        return await _infer_longdoc(
            file_type=file_type, document_title=document_title, pages=pages
        )
    return await _infer_full_text(
        file_type=file_type, document_title=document_title, pages=pages
    )


async def _infer_full_text(
    *,
    file_type: FileType,
    document_title: str,
    pages: list[str],
) -> AIParseOutcome:
    max_chars = settings.AI_PARSER_MAX_CHARS
    max_input_tokens = settings.AI_PARSER_MAX_INPUT_TOKENS
    truncated_any = False
    response: httpx.Response | None = None

    for _attempt in range(3):
        prepared, truncated = _prepare_pages_payload(
            pages,
            max_chars=max_chars,
            max_input_tokens=max_input_tokens,
        )
        if not prepared:
            return AIParseOutcome(
                diagnostics=["AI parser input became empty after preprocessing"]
            )

        try:
            async with httpx.AsyncClient(
                timeout=settings.AI_PARSER_TIMEOUT_SECONDS
            ) as client:
                response = await _post_gemini(
                    client,
                    api_key=settings.GEMINI_API_KEY,
                    model=settings.GEMINI_MODEL,
                    system_prompt=_system_prompt(),
                    user_prompt=_user_prompt(
                        file_type=file_type,
                        document_title=document_title,
                        prepared_pages=prepared,
                    ),
                    response_schema=_response_schema(),
                    max_tokens=settings.AI_PARSER_MAX_TOKENS,
                    temperature=0,
                )
                response.raise_for_status()
            logger.info(
                "AI parser request ok for %s via %s | prompt_chars=%s | truncated=%s | max_tokens=%s",
                document_title,
                settings.GEMINI_MODEL,
                len(prepared),
                truncated,
                settings.AI_PARSER_MAX_TOKENS,
            )
            truncated_any = truncated_any or truncated
            break
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code if exc.response is not None else 0
            if _is_context_limit_error(exc) and (
                max_chars > 4000 or max_input_tokens > 2500
            ):
                max_chars = max(int(max_chars * 0.6), 4000)
                max_input_tokens = max(int(max_input_tokens * 0.75), 2500)
                truncated_any = True
                continue
            if status_code == 429:
                logger.warning("AI parser rate-limited for %s", document_title)
                return AIParseOutcome(
                    diagnostics=["AI parser rate-limited by provider. Try again later."]
                )
            logger.warning(
                "AI parser HTTP %s for %s: %s",
                status_code,
                document_title,
                _preview_text(
                    exc.response.text if exc.response is not None else str(exc)
                ),
            )
            return AIParseOutcome(
                diagnostics=[
                    f"AI parser HTTP error ({status_code}): "
                    + _preview_text(
                        exc.response.text if exc.response is not None else str(exc), 120
                    )
                ]
            )
        except httpx.TimeoutException as exc:
            logger.warning("AI parser timeout for %s: %s", document_title, str(exc))
            return AIParseOutcome(diagnostics=["AI parser timed out. Try again later."])
        except httpx.RequestError as exc:
            logger.warning(
                "AI parser request error for %s: %s", document_title, str(exc)
            )
            return AIParseOutcome(diagnostics=["AI parser request error"])
    else:
        return AIParseOutcome(diagnostics=["AI parser exhausted retries"])

    if response is None:
        return AIParseOutcome(diagnostics=["AI parser produced no response"])

    message = _extract_gemini_content(response.json())
    if not message:
        logger.warning("AI parser empty content for %s", document_title)
        return AIParseOutcome(diagnostics=["AI parser returned empty content"])

    logger.info(
        "AI parser raw output preview for %s: %s",
        document_title,
        _preview_text(message, 500),
    )

    suggestion = _parse_ai_response(message, page_count=len(pages))
    if suggestion is None:
        logger.warning(
            "AI parser returned non-JSON or unusable response for %s. Preview: %s",
            document_title,
            _preview_text(message),
        )
        return AIParseOutcome(
            diagnostics=[
                "AI parser returned unusable structured output",
                "AI preview: " + _preview_text(message, 120),
            ]
        )
    if truncated_any:
        suggestion.review_required = True
        suggestion.warnings.append("AI input truncated to fit parser limits")
    logger.info(
        "AI parser parsed %s sections for %s: %s",
        len(suggestion.sections),
        document_title,
        ", ".join(section.title for section in suggestion.sections[:5]),
    )
    return AIParseOutcome(suggestion=suggestion)


async def _infer_longdoc(
    *,
    file_type: FileType,
    document_title: str,
    pages: list[str],
) -> AIParseOutcome:
    """Long-doc strategy: compress pages to heading candidates so the whole
    document fits the budget in one call. Window only when even the compressed
    payload overflows. Page markers stay absolute, so windowed sections need no
    renumbering — only seam dedupe on merge.
    """
    # Prefer explicit chapter markers ("Chương N"). They give chapter-level
    # granularity deterministically and avoid the over-segmentation that windowed
    # AI inference produces when it only sees subsection headings.
    chapter_sections = _detect_chapter_boundaries(pages)
    if chapter_sections:
        return AIParseOutcome(
            suggestion=AIStructureSuggestion(
                sections=chapter_sections,
                confidence=0.95,
                review_required=False,
                warnings=[],
            )
        )

    context_lines = settings.AI_PARSER_CANDIDATE_CONTEXT_LINES
    items = [(index + 1, page) for index, page in enumerate(pages)]
    payload = _build_candidate_payload(items, context_lines=context_lines)

    if _fits_budget(payload):
        suggestion, diagnostics = await _request_structure(
            file_type=file_type,
            document_title=document_title,
            prepared_pages=payload,
            page_count=len(pages),
        )
        if suggestion is not None:
            return AIParseOutcome(suggestion=suggestion)
        return AIParseOutcome(diagnostics=diagnostics)

    return await _infer_windowed(
        file_type=file_type,
        document_title=document_title,
        pages=pages,
        context_lines=context_lines,
    )


def _detect_chapter_boundaries(pages: list[str]) -> list[AISectionBoundary]:
    """Deterministically segment by explicit chapter markers.

    Returns chapter-level boundaries when the document has >=2 distinct chapter
    numbers, else [] (caller falls back to AI inference). Robust to chapter titles
    repeated in running headers: only the earliest non-TOC page of each chapter
    number is taken as that chapter's start.
    """
    toc_pages = detect_toc_pages(pages)
    earliest: dict[int, tuple[int, str]] = {}
    for index, page in enumerate(pages):
        if index in toc_pages:
            continue
        lines = [line for line in page.splitlines() if line.strip()]
        for position, line in enumerate(lines):
            marker = chapter_marker(line)
            if marker is None:
                continue
            number, title = marker
            title = _enrich_chapter_title(title, lines, position)
            if number not in earliest:
                earliest[number] = (index + 1, title)
            break  # first chapter heading on the page is enough

    if len(earliest) < 2:
        return []

    ordered = sorted(earliest.items(), key=lambda item: item[1][0])
    boundaries: list[AISectionBoundary] = []
    for position, (_number, (page_start, title)) in enumerate(ordered):
        next_start = (
            ordered[position + 1][1][0] if position + 1 < len(ordered) else None
        )
        page_end = (next_start - 1) if next_start is not None else len(pages)
        boundaries.append(
            AISectionBoundary(
                title=title[:255],
                page_start=page_start,
                page_end=max(page_end, page_start),
            )
        )
    return boundaries


def _enrich_chapter_title(title: str, lines: list[str], position: int) -> str:
    """Append the continuation line when the heading is just the marker.

    PDF extraction often puts "Chương 1" on its own line with the descriptive
    title ("Biến cố và xác suất...") on the next line. Merge them so chapters
    carry meaningful titles.
    """
    # Text after the chapter number on the heading line itself.
    remainder = re.sub(
        r"^\s*(chương|chapter|phần)\s+(\d{1,3}|[ivxlcdm]{1,7})\b[.:)\-\s]*",
        "",
        title,
        flags=re.IGNORECASE,
    ).strip()
    if len(remainder) >= 4:
        return title
    if position + 1 < len(lines):
        continuation = lines[position + 1].strip()
        if continuation and not is_heading_line(continuation):
            merged = f"{title} {continuation}".strip()
            return merged[:255]
    return title


async def _infer_windowed(
    *,
    file_type: FileType,
    document_title: str,
    pages: list[str],
    context_lines: int,
) -> AIParseOutcome:
    windows = _build_candidate_windows(pages, context_lines=context_lines)
    merged: list[AISectionBoundary] = []
    diagnostics: list[str] = []
    confidences: list[float] = []
    succeeded = 0

    for payload in windows:
        suggestion, window_diag = await _request_structure(
            file_type=file_type,
            document_title=document_title,
            prepared_pages=payload,
            page_count=len(pages),
        )
        if suggestion is None:
            diagnostics.extend(window_diag)
            continue
        succeeded += 1
        merged.extend(suggestion.sections)
        if suggestion.confidence is not None:
            confidences.append(suggestion.confidence)

    if not merged:
        diagnostics.insert(0, "Windowed AI parser produced no usable sections")
        return AIParseOutcome(diagnostics=_dedupe_preserve_order(diagnostics))

    sections = _merge_section_boundaries(merged)
    confidence = min(confidences) if confidences else None
    warnings = ["Long document parsed in windows; review boundaries"]
    if succeeded < len(windows):
        warnings.append("Some document windows failed AI parsing")
    return AIParseOutcome(
        suggestion=AIStructureSuggestion(
            sections=sections,
            confidence=confidence,
            review_required=True,
            warnings=warnings,
        )
    )


async def _request_structure(
    *,
    file_type: FileType,
    document_title: str,
    prepared_pages: str,
    page_count: int,
) -> tuple[AIStructureSuggestion | None, list[str]]:
    """Single Gemini structure call for an already-budgeted payload."""
    try:
        async with httpx.AsyncClient(
            timeout=settings.AI_PARSER_TIMEOUT_SECONDS
        ) as client:
            response = await _post_gemini(
                client,
                api_key=settings.GEMINI_API_KEY,
                model=settings.GEMINI_MODEL,
                system_prompt=_system_prompt(),
                user_prompt=_user_prompt(
                    file_type=file_type,
                    document_title=document_title,
                    prepared_pages=prepared_pages,
                ),
                response_schema=_response_schema(),
                max_tokens=settings.AI_PARSER_MAX_TOKENS,
                temperature=0,
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code if exc.response is not None else 0
        if status_code == 429:
            return None, ["AI parser rate-limited by provider. Try again later."]
        return None, [f"AI parser HTTP error ({status_code})"]
    except httpx.TimeoutException:
        return None, ["AI parser timed out. Try again later."]
    except httpx.RequestError:
        return None, ["AI parser request error"]

    message = _extract_gemini_content(response.json())
    if not message:
        return None, ["AI parser returned empty content"]
    suggestion = _parse_ai_response(message, page_count=page_count)
    if suggestion is None:
        return None, ["AI parser returned unusable structured output"]
    return suggestion, []


def _build_candidate_payload(
    items: list[tuple[int, str]], *, context_lines: int
) -> str:
    parts: list[str] = []
    for page_number, page in items:
        compressed = _compress_page_to_candidates(page, context_lines=context_lines)
        parts.append(f"[[PAGE {page_number}]]\n{compressed}".rstrip())
    return "\n\n".join(parts)


def _build_candidate_windows(pages: list[str], *, context_lines: int) -> list[str]:
    """Split pages into windows whose compressed payload each fits the budget.
    Markers stay absolute so the merge step needs no page renumbering.
    """
    windows: list[str] = []
    current: list[tuple[int, str]] = []
    for index, page in enumerate(pages):
        candidate = current + [(index + 1, page)]
        if current and not _fits_budget(
            _build_candidate_payload(candidate, context_lines=context_lines)
        ):
            windows.append(
                _build_candidate_payload(current, context_lines=context_lines)
            )
            current = [(index + 1, page)]
        else:
            current = candidate
    if current:
        windows.append(_build_candidate_payload(current, context_lines=context_lines))
    return windows


def _compress_page_to_candidates(page: str, *, context_lines: int) -> str:
    lines = [line for line in page.splitlines() if line.strip()]
    if not lines:
        return ""
    keep: set[int] = set()
    for index, line in enumerate(lines):
        if is_heading_line(line):
            for offset in range(-context_lines, context_lines + 1):
                neighbor = index + offset
                if 0 <= neighbor < len(lines):
                    keep.add(neighbor)
    if not keep:
        # No heading on this page: keep the first line as a positional anchor so
        # the AI still knows the page exists and roughly what it contains.
        keep.add(0)
    return "\n".join(lines[index] for index in sorted(keep))


def _merge_section_boundaries(
    boundaries: list[AISectionBoundary],
) -> list[AISectionBoundary]:
    boundaries = sorted(
        boundaries,
        key=lambda b: (b.page_start or 10**9, b.page_end or 10**9, b.title.lower()),
    )
    merged: list[AISectionBoundary] = []
    seen: set[tuple[str, int | None, int | None]] = set()
    for boundary in boundaries:
        key = (boundary.title.strip().lower(), boundary.page_start, boundary.page_end)
        if key in seen:
            continue
        # Seam dedupe: drop a boundary that starts on the same page as the
        # previous one with the same title (window overlap artifact).
        if (
            merged
            and merged[-1].page_start == boundary.page_start
            and (merged[-1].title.strip().lower() == boundary.title.strip().lower())
        ):
            continue
        seen.add(key)
        merged.append(boundary)
    return merged


def _fits_budget(text: str) -> bool:
    return (
        len(text) <= settings.AI_PARSER_MAX_CHARS
        and _estimate_tokens(text) <= settings.AI_PARSER_MAX_INPUT_TOKENS
    )


def _system_prompt() -> str:
    return (
        "You segment uploaded study documents into chapters or sections. "
        "Return JSON only. Never include markdown fences unless absolutely necessary. "
        "Use only text present in source. Do not invent titles, anchors, or page numbers. "
        "Prefer fewer, coherent sections over noisy micro-splits. "
        "Do not output chain-of-thought. Do not explain. Output one compact JSON object "
        "that matches the provided schema exactly."
    )


def _user_prompt(
    *,
    file_type: FileType,
    document_title: str,
    prepared_pages: str,
) -> str:
    return f"""
Document title: {document_title}
Document type: {file_type.value}

Task:
1. Find main learning sections suitable for downstream quiz generation.
2. Use page numbers from markers like [[PAGE 1]].
3. Return only major sections. Merge small subsections into parent sections.
4. Return at most 12 sections total.
5. Keep output compact. Titles short. Warnings max 3 items.
6. Do not include quotes from source.
7. For each section, return:
   - title: short section title from source or concise normalization
   - page_start: first page number
   - page_end: last page number
8. Also return:
   - confidence: float from 0 to 1
   - review_required: boolean
   - warnings: list of short strings
9. Output schema:
{{
  "confidence": 0.0,
  "review_required": false,
  "warnings": ["..."],
  "sections": [
    {{
      "title": "...",
      "page_start": 1,
      "page_end": 2
    }}
  ]
}}
10. Output JSON only. No prose before or after JSON.

Source pages:
{prepared_pages}
""".strip()


def _response_schema() -> dict[str, Any]:
    return {
        "type": "OBJECT",
        "properties": {
            "confidence": {"type": "NUMBER"},
            "review_required": {"type": "BOOLEAN"},
            "warnings": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
            },
            "sections": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "title": {"type": "STRING"},
                        "page_start": {"type": "INTEGER"},
                        "page_end": {"type": "INTEGER"},
                    },
                    "required": ["title", "page_start", "page_end"],
                },
            },
        },
        "required": ["confidence", "review_required", "warnings", "sections"],
    }


async def _post_gemini(
    client: httpx.AsyncClient,
    *,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_schema: dict,
    max_tokens: int,
    temperature: float,
    thinking_budget: int | None = None,
) -> httpx.Response:
    url = f"{_GEMINI_BASE_URL}/{model}:generateContent"
    generation_config: dict[str, Any] = {
        "maxOutputTokens": max_tokens,
        "temperature": temperature,
        "responseMimeType": "application/json",
        "responseSchema": response_schema,
    }
    # Gemini 2.5 "thinking" models spend output-token budget on internal reasoning
    # before emitting visible JSON. Cap that budget so large responses are not
    # truncated mid-object (which would make the JSON unparseable).
    if thinking_budget is not None:
        generation_config["thinkingConfig"] = {"thinkingBudget": thinking_budget}
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": generation_config,
    }
    return await client.post(url, params={"key": api_key}, json=payload)


def _extract_gemini_content(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        return ""
    parts = (candidates[0].get("content") or {}).get("parts") or []
    if not parts:
        return ""
    return str(parts[0].get("text") or "").strip()


def _prepare_pages_payload(
    pages: list[str],
    *,
    max_chars: int,
    max_input_tokens: int,
) -> tuple[str, bool]:
    parts: list[str] = []
    total_chars = 0
    total_tokens = 0
    truncated = False
    for index, raw_page in enumerate(pages, start=1):
        page = _normalize_page_text(raw_page)
        if not page:
            continue
        marker = f"[[PAGE {index}]]\n"
        chunk = f"{marker}{page}"
        projected = total_chars + len(chunk) + 2
        projected_tokens = total_tokens + _estimate_tokens(chunk)
        if projected > max_chars or projected_tokens > max_input_tokens:
            clipped_page = _clip_page_text(
                page,
                available_chars=max(max_chars - total_chars - len(marker) - 2, 0),
                available_tokens=max(
                    max_input_tokens - total_tokens - _estimate_tokens(marker), 0
                ),
            )
            if clipped_page:
                parts.append(f"{marker}{clipped_page}")
            truncated = True
            break
        parts.append(chunk)
        total_chars = projected
        total_tokens = projected_tokens
    return "\n\n".join(parts), truncated


def _normalize_page_text(value: str) -> str:
    return "\n".join(line.strip() for line in value.splitlines() if line.strip())


def _estimate_tokens(value: str) -> int:
    compact = value.strip()
    if not compact:
        return 0
    return max(1, len(compact) // 3)


def _clip_page_text(value: str, *, available_chars: int, available_tokens: int) -> str:
    if available_chars <= 0 or available_tokens <= 0:
        return ""
    char_cap = min(available_chars, available_tokens * 3)
    if len(value) <= char_cap:
        return value

    clipped = value[:char_cap]
    last_break = max(clipped.rfind("\n"), clipped.rfind(" "))
    if last_break >= max(char_cap // 2, 1):
        clipped = clipped[:last_break]
    return clipped.strip()


def _is_context_limit_error(exc: httpx.HTTPStatusError) -> bool:
    try:
        detail = exc.response.text.lower()
    except Exception:
        return False
    return (
        "request payload size exceeds" in detail
        or "too large" in detail
        or "exceeds the available context size" in detail
        or "context size" in detail
        or ("tokens" in detail and "limit" in detail)
    )


def _parse_ai_response(raw: str, *, page_count: int) -> AIStructureSuggestion | None:
    data = _load_json_object(raw)
    if not isinstance(data, dict):
        return None

    raw_sections = data.get("sections") or []
    if not isinstance(raw_sections, list):
        return None

    sections: list[AISectionBoundary] = []
    for item in raw_sections:
        normalized = _normalize_section(item, page_count=page_count)
        if normalized is not None:
            sections.append(normalized)

    if not sections:
        return None

    confidence = _normalize_confidence(data.get("confidence"))
    warnings = [str(w).strip() for w in (data.get("warnings") or []) if str(w).strip()]
    review_required = bool(data.get("review_required"))
    if confidence is not None and confidence < settings.AI_PARSER_MIN_CONFIDENCE:
        review_required = True
        warnings.append("AI confidence below threshold")

    sections.sort(
        key=lambda section: (
            section.page_start or 10**9,
            section.page_end or 10**9,
            section.title.lower(),
        )
    )

    return AIStructureSuggestion(
        sections=sections,
        confidence=confidence,
        review_required=review_required,
        warnings=_dedupe_preserve_order(warnings),
    )


def _load_json_object(raw: str) -> dict[str, Any] | None:
    text = _THINK_BLOCK_RE.sub("", raw).strip()
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
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


def _normalize_section(item: Any, *, page_count: int) -> AISectionBoundary | None:
    if not isinstance(item, dict):
        return None
    title = str(item.get("title") or "").strip()
    if not title:
        return None

    page_start = _normalize_page(item.get("page_start"), page_count=page_count)
    page_end = _normalize_page(item.get("page_end"), page_count=page_count)
    if page_start is None and page_end is None:
        return None
    if page_start is None:
        page_start = page_end
    if page_end is None:
        page_end = page_start
    if page_start is None or page_end is None or page_start > page_end:
        return None

    return AISectionBoundary(
        title=title[:255],
        page_start=page_start,
        page_end=page_end,
        start_anchor=str(item.get("start_anchor") or "").strip(),
        end_anchor=str(item.get("end_anchor") or "").strip(),
    )


def _normalize_page(value: Any, *, page_count: int) -> int | None:
    try:
        page = int(value)
    except (TypeError, ValueError):
        return None
    if page < 1:
        return 1
    if page > page_count:
        return page_count
    return page


def _normalize_confidence(value: Any) -> float | None:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return None
    if confidence < 0:
        return 0.0
    if confidence > 1:
        return 1.0
    return confidence


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(value)
    return out


def _extract_balanced_json_object(text: str) -> str | None:
    start_indexes = [index for index, char in enumerate(text) if char == "{"]
    for start in start_indexes:
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
                    candidate = text[start : index + 1].strip()
                    if '"sections"' in candidate:
                        return candidate
                    break
    return None


def _preview_text(value: str, limit: int = 240) -> str:
    compact = " ".join(value.split())
    if len(compact) <= limit:
        return compact
    return compact[:limit] + "..."
