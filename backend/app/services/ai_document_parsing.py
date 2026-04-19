import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlparse

import httpx

from backend.app.config import settings
from backend.app.models.enums import FileType

_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)
_THINK_BLOCK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
logger = logging.getLogger(__name__)


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

    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }
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

        payload = {
            "model": settings.AI_PARSER_MODEL,
            "messages": [
                {"role": "system", "content": _system_prompt()},
                {
                    "role": "user",
                    "content": _user_prompt(
                        file_type=file_type,
                        document_title=document_title,
                        prepared_pages=prepared,
                    ),
                },
            ],
            "max_tokens": settings.AI_PARSER_MAX_TOKENS,
            "temperature": 0,
            "chat_template_kwargs": {"enable_thinking": False},
            "reasoning_format": "none",
            "response_format": _response_format_schema(),
        }

        try:
            async with httpx.AsyncClient(
                timeout=settings.AI_PARSER_TIMEOUT_SECONDS
            ) as client:
                response = await _post_chat_completions(
                    client,
                    base_url=settings.AI_SERVER_URL,
                    headers=headers,
                    payload=payload,
                )
                response.raise_for_status()
            logger.info(
                "AI parser request ok for %s via %s | prompt_chars=%s | truncated=%s | max_tokens=%s",
                document_title,
                settings.AI_SERVER_URL,
                len(prepared),
                truncated,
                settings.AI_PARSER_MAX_TOKENS,
            )
            truncated_any = truncated_any or truncated
            break
        except httpx.HTTPStatusError as exc:
            if _is_context_limit_error(exc) and (
                max_chars > 4000 or max_input_tokens > 2500
            ):
                max_chars = max(int(max_chars * 0.6), 4000)
                max_input_tokens = max(int(max_input_tokens * 0.75), 2500)
                truncated_any = True
                continue
            logger.warning(
                "AI parser HTTP error for %s: %s",
                document_title,
                _preview_text(
                    exc.response.text if exc.response is not None else str(exc)
                ),
            )
            return AIParseOutcome(
                diagnostics=[
                    "AI parser HTTP error: "
                    + _preview_text(
                        exc.response.text if exc.response is not None else str(exc), 120
                    )
                ]
            )
        except httpx.RequestError as exc:
            logger.warning(
                "AI parser request error for %s: %s", document_title, str(exc)
            )
            return AIParseOutcome(diagnostics=["AI parser request error"])
    else:
        return AIParseOutcome(diagnostics=["AI parser exhausted retries"])

    if response is None:
        return AIParseOutcome(diagnostics=["AI parser produced no response"])

    message = _extract_message_content(response.json())
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


def _system_prompt() -> str:
    return (
        "/nothink\n"
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


def _response_format_schema() -> dict[str, Any]:
    return {
        "type": "json_schema",
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                "review_required": {"type": "boolean"},
                "warnings": {
                    "type": "array",
                    "maxItems": 3,
                    "items": {"type": "string", "maxLength": 160},
                },
                "sections": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 12,
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "title": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 255,
                            },
                            "page_start": {"type": "integer", "minimum": 1},
                            "page_end": {"type": "integer", "minimum": 1},
                        },
                        "required": ["title", "page_start", "page_end"],
                    },
                },
            },
            "required": ["confidence", "review_required", "warnings", "sections"],
        },
    }


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
    return "exceeds the available context size" in detail or "context size" in detail


def _extract_message_content(payload: dict[str, Any]) -> str:
    choices = payload.get("choices") or []
    if not choices:
        return ""
    choice = choices[0] or {}
    message = choice.get("message") or {}
    content = message.get("content")
    reasoning_content = message.get("reasoning_content") or choice.get(
        "reasoning_content"
    )
    if isinstance(content, str):
        content = content.strip()
        if content:
            return content
    if isinstance(content, list):
        text_parts = [
            item.get("text", "") for item in content if isinstance(item, dict)
        ]
        merged = "\n".join(part for part in text_parts if part).strip()
        if merged:
            return merged
    if isinstance(reasoning_content, str):
        return reasoning_content.strip()
    if isinstance(reasoning_content, list):
        text_parts = [
            item.get("text", "") for item in reasoning_content if isinstance(item, dict)
        ]
        return "\n".join(part for part in text_parts if part).strip()
    if isinstance(choice.get("text"), str):
        return choice.get("text", "").strip()
    return ""


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


async def _post_chat_completions(
    client: httpx.AsyncClient,
    *,
    base_url: str,
    headers: dict[str, str],
    payload: dict[str, Any],
) -> httpx.Response:
    parsed = urlparse(base_url)
    base = base_url.rstrip("/")
    candidate_urls: list[str] = []
    if parsed.path.endswith("/v1"):
        candidate_urls.append(f"{base}/chat/completions")
    elif parsed.path.endswith("/chat/completions"):
        candidate_urls.append(base)
    else:
        candidate_urls.append(f"{base}/v1/chat/completions")
        candidate_urls.append(f"{base}/chat/completions")

    last_response: httpx.Response | None = None
    for url in candidate_urls:
        response = await client.post(url, headers=headers, json=payload)
        last_response = response
        if response.status_code != 404:
            return response
    assert last_response is not None
    return last_response
