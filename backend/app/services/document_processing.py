import base64
import logging
import re
import unicodedata
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from backend.app.models.enums import FileType
from backend.app.services.ai_document_parsing import infer_document_structure

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
_UPLOAD_ROOT = Path("backend/uploads")
_WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
_REL_NS = {"r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
_CHAPTER_RE = re.compile(
    r"^(chapter|chương)\s+[\wivxlcdm0-9]+([.:\\-]\s*.+)?$",
    re.IGNORECASE,
)
_SECTION_RE = re.compile(r"^(\d+(\.\d+){0,3}|[IVXLC]{1,8})[.)]?\s+\S+")
_TITLE_CASE_RE = re.compile(r"^[A-ZÀ-Ỹ0-9][A-ZÀ-Ỹ0-9\s:._-]{4,}$")
logger = logging.getLogger(__name__)


@dataclass
class ParseDocumentResult:
    sections: list[dict]
    parser_mode: str = "fallback"
    review_required: bool = False
    confidence: float | None = None
    warnings: list[str] = field(default_factory=list)


def decode_base64_payload(payload: str) -> bytes:
    if "," in payload and payload.strip().startswith("data:"):
        payload = payload.split(",", 1)[1]
    return base64.b64decode(payload, validate=True)


def detect_file_type(file_name: str) -> FileType:
    suffix = Path(file_name).suffix.lower()
    if suffix == ".pdf":
        return FileType.PDF
    if suffix == ".docx":
        return FileType.DOCX
    raise ValueError("Unsupported file type")


def store_uploaded_file(user_id: int, file_name: str, content: bytes) -> str:
    safe_name = _sanitize_filename(file_name)
    user_dir = _UPLOAD_ROOT / f"user_{user_id}"
    user_dir.mkdir(parents=True, exist_ok=True)
    target = _unique_path(user_dir / safe_name)
    target.write_bytes(content)
    return str(target)


async def parse_document(
    file_type: FileType, content: bytes, title: str
) -> ParseDocumentResult:
    pages = _extract_pages(file_type, content)
    if pages:
        ai_outcome = await infer_document_structure(
            file_type=file_type,
            document_title=title,
            pages=pages,
        )
        ai_suggestion = ai_outcome.suggestion
        if ai_suggestion is not None:
            sections = _build_ai_sections(pages, ai_suggestion.sections, title)
            if sections:
                warnings = list(ai_suggestion.warnings)
                if ai_suggestion.review_required:
                    warnings.append("Review suggested AI structure before saving")
                return ParseDocumentResult(
                    sections=sections,
                    parser_mode="ai",
                    review_required=ai_suggestion.review_required,
                    confidence=ai_suggestion.confidence,
                    warnings=_dedupe_preserve_order(warnings),
                )
            logger.warning(
                "AI parser produced %s boundaries but no usable sections for %s",
                len(ai_suggestion.sections),
                title,
            )

    sections = _parse_document_fallback(file_type, content, title, pages=pages)
    warnings = ["Using fallback structure parser"]
    if pages:
        try:
            warnings.extend(ai_outcome.diagnostics)
        except UnboundLocalError:
            pass
    if pages and sum(len(page.strip()) for page in pages) < 400:
        warnings.append("Very little extractable text found in file")
    return ParseDocumentResult(
        sections=sections,
        parser_mode="fallback",
        review_required=True,
        warnings=warnings,
    )


def extract_text(file_type: FileType, content: bytes) -> str:
    if file_type == FileType.DOCX:
        return _extract_docx_text(content)
    if file_type == FileType.PDF:
        return _extract_pdf_text(content)
    return ""


def extract_pages(file_type: FileType, content: bytes) -> list[str]:
    return _extract_pages(file_type, content)


def extract_pages_from_path(file_type: FileType, file_path: str) -> list[str]:
    try:
        content = Path(file_path).read_bytes()
    except OSError:
        return []
    return extract_pages(file_type, content)


def _parse_document_fallback(
    file_type: FileType, content: bytes, title: str, pages: list[str] | None = None
) -> list[dict]:
    if file_type == FileType.DOCX:
        sections = _parse_docx_sections(content, title)
        if sections:
            return sections
    if file_type == FileType.PDF and pages:
        return split_into_chapters(title, "\n".join(pages), pages=pages)
    extracted = extract_text(file_type, content)
    return split_into_chapters(title, extracted)


def _extract_pages(file_type: FileType, content: bytes) -> list[str]:
    if file_type == FileType.DOCX:
        return _extract_docx_pages(content)
    if file_type == FileType.PDF:
        return _extract_pdf_pages(content)
    return []


def _build_ai_sections(
    pages: list[str], boundaries: list[object], document_title: str
) -> list[dict]:
    aligned_starts = [
        _find_section_start(
            pages,
            page_start=getattr(boundary, "page_start", None),
            page_end=getattr(boundary, "page_end", None),
            title=getattr(boundary, "title", "") or document_title or "Phần",
        )
        for boundary in boundaries
    ]

    sections: list[dict] = []
    for index, boundary in enumerate(boundaries):
        page_start = getattr(boundary, "page_start", None)
        page_end = getattr(boundary, "page_end", None)
        if page_start is None or page_end is None or page_start > page_end:
            continue

        aligned_page_start, aligned_offset = aligned_starts[index]
        next_start = (
            aligned_starts[index + 1] if index + 1 < len(aligned_starts) else None
        )
        effective_end_page = _resolve_section_end_page(
            total_pages=len(pages),
            fallback_end_page=page_end,
            next_start=next_start,
        )
        raw_content = _slice_section_between_positions(
            pages,
            start_page=aligned_page_start or page_start,
            start_offset=aligned_offset if aligned_page_start is not None else 0,
            end_page=effective_end_page,
            next_start=next_start,
        )
        content_text = _normalize_section_text(raw_content)
        if not content_text:
            continue
        sections.append(
            {
                "title": (getattr(boundary, "title", "") or document_title or "Phần")[
                    :255
                ],
                "content_text": content_text,
                "page_start": aligned_page_start or page_start,
                "page_end": effective_end_page,
            }
        )
    return _dedupe_sections(sections)


def split_into_chapters(
    document_title: str, text: str, pages: list[str] | None = None
) -> list[dict]:
    normalized_lines = [line.strip() for line in text.splitlines()]
    normalized_lines = [line for line in normalized_lines if line]
    if not normalized_lines:
        return [
            {
                "title": "Toàn bộ tài liệu",
                "content_text": "",
                "page_start": None,
                "page_end": None,
            }
        ]

    sections: list[dict] = []
    current_title: str | None = None
    current_lines: list[str] = []

    for line in normalized_lines:
        if _is_heading(line):
            if current_title is not None or current_lines:
                sections.append(
                    {
                        "title": current_title or "Mở đầu",
                        "content_text": "\n".join(current_lines).strip(),
                        "page_start": _find_page_index("\n".join(current_lines), pages),
                        "page_end": _find_page_index(
                            "\n".join(current_lines), pages, from_end=True
                        ),
                    }
                )
                current_lines = []
            current_title = line
        else:
            current_lines.append(line)

    if current_title is not None or current_lines:
        sections.append(
            {
                "title": current_title or "Mở đầu",
                "content_text": "\n".join(current_lines).strip(),
                "page_start": _find_page_index("\n".join(current_lines), pages),
                "page_end": _find_page_index(
                    "\n".join(current_lines), pages, from_end=True
                ),
            }
        )

    cleaned = [
        section
        for section in sections
        if section["title"].strip() or section["content_text"].strip()
    ]
    if len(cleaned) <= 1:
        chunks = _chunk_text("\n".join(normalized_lines), 2500)
        if len(chunks) == 1:
            return [
                {
                    "title": document_title or "Toàn bộ tài liệu",
                    "content_text": chunks[0],
                    "page_start": _find_page_index(chunks[0], pages),
                    "page_end": _find_page_index(chunks[0], pages, from_end=True),
                }
            ]
        return [
            {
                "title": f"Phần {index}",
                "content_text": chunk,
                "page_start": _find_page_index(chunk, pages),
                "page_end": _find_page_index(chunk, pages, from_end=True),
            }
            for index, chunk in enumerate(chunks, start=1)
        ]

    out: list[dict] = []
    for section in cleaned:
        out.append(
            {
                "title": section["title"][:255] or document_title or "Phần",
                "content_text": section["content_text"],
                "page_start": section.get("page_start"),
                "page_end": section.get("page_end"),
            }
        )
    return out


def _extract_docx_text(content: bytes) -> str:
    try:
        with ZipFile(BytesIO(content)) as archive:
            xml_bytes = archive.read("word/document.xml")
    except (BadZipFile, KeyError):
        return ""

    root = ElementTree.fromstring(xml_bytes)
    paragraphs: list[str] = []
    for paragraph in root.findall(".//w:p", _WORD_NS):
        runs = [node.text or "" for node in paragraph.findall(".//w:t", _WORD_NS)]
        text = "".join(runs).strip()
        if text:
            paragraphs.append(text)
    return "\n".join(paragraphs)


def _extract_docx_pages(content: bytes) -> list[str]:
    try:
        with ZipFile(BytesIO(content)) as archive:
            document_xml = archive.read("word/document.xml")
    except (BadZipFile, KeyError):
        return []

    root = ElementTree.fromstring(document_xml)
    pages: list[list[str]] = [[]]
    for paragraph in root.findall(".//w:body/w:p", _WORD_NS):
        text = "".join(
            node.text or "" for node in paragraph.findall(".//w:t", _WORD_NS)
        ).strip()
        if text:
            pages[-1].append(text)
        has_page_break = bool(
            paragraph.findall(".//w:lastRenderedPageBreak", _WORD_NS)
            or [
                node
                for node in paragraph.findall(".//w:br", _WORD_NS)
                if node.get(f"{{{_WORD_NS['w']}}}type") == "page"
            ]
        )
        if has_page_break:
            pages.append([])

    normalized_pages = [
        "\n".join(part for part in page if part).strip() for page in pages
    ]
    return [page for page in normalized_pages if page]


def _parse_docx_sections(content: bytes, document_title: str) -> list[dict]:
    try:
        with ZipFile(BytesIO(content)) as archive:
            document_xml = archive.read("word/document.xml")
            styles_xml = (
                archive.read("word/styles.xml")
                if "word/styles.xml" in archive.namelist()
                else None
            )
    except (BadZipFile, KeyError):
        return []

    style_names = _load_docx_styles(styles_xml)
    root = ElementTree.fromstring(document_xml)
    sections: list[dict] = []
    current_title: str | None = None
    current_lines: list[str] = []
    current_page = 1
    section_page_start = 1

    for paragraph in root.findall(".//w:body/w:p", _WORD_NS):
        text = "".join(
            node.text or "" for node in paragraph.findall(".//w:t", _WORD_NS)
        ).strip()
        style_id_node = paragraph.find("./w:pPr/w:pStyle", _WORD_NS)
        style_id = (
            style_id_node.get(f"{{{_WORD_NS['w']}}}val")
            if style_id_node is not None
            else None
        )
        style_name = style_names.get(style_id or "", "")
        has_page_break = bool(
            paragraph.findall(".//w:lastRenderedPageBreak", _WORD_NS)
            or [
                node
                for node in paragraph.findall(".//w:br", _WORD_NS)
                if node.get(f"{{{_WORD_NS['w']}}}type") == "page"
            ]
        )
        is_heading = bool(text) and _is_heading(text, style_name)

        if is_heading:
            if current_title is not None or current_lines:
                sections.append(
                    {
                        "title": current_title or "Mở đầu",
                        "content_text": "\n".join(current_lines).strip(),
                        "page_start": section_page_start,
                        "page_end": current_page,
                    }
                )
                current_lines = []
            current_title = text
            section_page_start = current_page
        elif text:
            current_lines.append(text)

        if has_page_break:
            current_page += 1

    if current_title is not None or current_lines:
        sections.append(
            {
                "title": current_title or document_title or "Toàn bộ tài liệu",
                "content_text": "\n".join(current_lines).strip(),
                "page_start": section_page_start,
                "page_end": current_page,
            }
        )

    cleaned = [
        section
        for section in sections
        if section["title"].strip() or section["content_text"].strip()
    ]
    return cleaned


def _load_docx_styles(styles_xml: bytes | None) -> dict[str, str]:
    if not styles_xml:
        return {}
    root = ElementTree.fromstring(styles_xml)
    styles: dict[str, str] = {}
    for style in root.findall(".//w:style", _WORD_NS):
        style_id = style.get(f"{{{_WORD_NS['w']}}}styleId")
        name_node = style.find("./w:name", _WORD_NS)
        if not style_id or name_node is None:
            continue
        styles[style_id] = (name_node.get(f"{{{_WORD_NS['w']}}}val") or "").lower()
    return styles


def _extract_pdf_text(content: bytes) -> str:
    pages = _extract_pdf_pages(content)
    if not pages:
        return ""
    return "\n".join(pages)


def _extract_pdf_pages(content: bytes) -> list[str]:
    pages = _extract_pdf_pages_pypdf(content)
    if pages:
        return pages
    return _extract_pdf_pages_regex(content)


def _extract_pdf_pages_pypdf(content: bytes) -> list[str]:
    try:
        from pypdf import PdfReader
        from pypdf.errors import PdfReadError
    except ImportError:
        return []

    try:
        reader = PdfReader(BytesIO(content))
    except (PdfReadError, ValueError, OSError):
        return []

    pages: list[str] = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        cleaned = " ".join(text.split())
        pages.append(text if cleaned else "")
    if any(page.strip() for page in pages):
        return pages
    return []


def _extract_pdf_pages_regex(content: bytes) -> list[str]:
    text = content.decode("latin-1", errors="ignore")
    text = text.replace("\\r", "\n").replace("\\n", "\n").replace("\\t", "\t")
    raw_pages = re.split(r"/Type\s*/Page\b", text)
    page_texts: list[str] = []
    for chunk in raw_pages:
        matches = re.findall(r"\(([^()]*)\)", chunk)
        cleaned = [_clean_pdf_fragment(match) for match in matches]
        cleaned = [fragment for fragment in cleaned if _looks_like_text(fragment)]
        if cleaned:
            page_texts.append("\n".join(cleaned))
    return page_texts


def _clean_pdf_fragment(fragment: str) -> str:
    fragment = fragment.replace("\\(", "(").replace("\\)", ")").replace("\\\\", "\\")
    fragment = re.sub(r"\\([0-7]{3})", lambda m: chr(int(m.group(1), 8)), fragment)
    return " ".join(fragment.split())


def _looks_like_text(value: str) -> bool:
    stripped = value.strip()
    if len(stripped) < 4:
        return False
    letters = sum(char.isalpha() for char in stripped)
    return letters >= max(3, len(stripped) // 4)


def _chunk_text(text: str, max_chars: int) -> list[str]:
    paragraphs = [part.strip() for part in text.split("\n") if part.strip()]
    if not paragraphs:
        return [text.strip()] if text.strip() else [""]

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for paragraph in paragraphs:
        projected = current_len + len(paragraph) + (1 if current else 0)
        if current and projected > max_chars:
            chunks.append("\n".join(current).strip())
            current = [paragraph]
            current_len = len(paragraph)
        else:
            current.append(paragraph)
            current_len = projected
    if current:
        chunks.append("\n".join(current).strip())
    return chunks


def _slice_pages_by_anchors(
    pages: list[str],
    *,
    page_start: int,
    page_end: int,
    start_anchor: str = "",
    end_anchor: str = "",
) -> str:
    selected_pages = pages[max(page_start - 1, 0) : page_end]
    content = "\n".join(selected_pages).strip()
    if not content:
        return ""

    start_index = _find_anchor_index(content, start_anchor)
    if start_index is None:
        start_index = 0

    end_index = _find_anchor_index(content, end_anchor, from_end=True)
    if end_index is None:
        end_index = len(content)
    else:
        end_index += len(end_anchor)

    if end_index <= start_index:
        return content
    return content[start_index:end_index].strip()


def _find_section_start(
    pages: list[str],
    *,
    page_start: int | None,
    page_end: int | None,
    title: str,
) -> tuple[int | None, int]:
    if page_start is None or page_end is None or page_start > page_end:
        return None, 0

    chapter_number_match = re.search(r"chương\s*(\d+)", title, re.IGNORECASE)
    chapter_pattern = None
    if chapter_number_match:
        chapter_number = chapter_number_match.group(1)
        chapter_pattern = re.compile(
            rf"(?im)^\s*chương\s*{re.escape(chapter_number)}\b.*$"
        )

    best_candidate: tuple[int, int, int] | None = None
    search_start = max(1, page_start - 6)
    search_end = min(len(pages), max(page_end, page_start) + 4)
    for candidate_page in range(search_start, search_end + 1):
        page_text = pages[candidate_page - 1]
        candidate_score = _score_section_start_candidate(
            page_text,
            chapter_number=chapter_number_match.group(1)
            if chapter_number_match
            else None,
            title=title,
        )
        candidate_offset = 0
        if chapter_pattern:
            match = chapter_pattern.search(page_text)
            if match and not _looks_like_toc_match(
                page_text, match.start(), match.end()
            ):
                candidate_score += 500
                candidate_offset = match.start()
        title_index = _find_anchor_index(page_text, title)
        if title_index is not None and not _looks_like_toc_match(
            page_text, title_index, title_index + len(title)
        ):
            candidate_score += max(50, 350 - min(title_index, 2500) // 8)
            if candidate_offset == 0 or title_index < candidate_offset:
                candidate_offset = title_index
        if candidate_score > 0 and (
            best_candidate is None
            or candidate_score > best_candidate[0]
            or (
                candidate_score == best_candidate[0]
                and candidate_page < best_candidate[1]
            )
        ):
            best_candidate = (candidate_score, candidate_page, candidate_offset)
    if best_candidate is not None:
        return best_candidate[1], best_candidate[2]
    return page_start, 0


def _resolve_section_end_page(
    *,
    total_pages: int,
    fallback_end_page: int,
    next_start: tuple[int | None, int] | None,
) -> int:
    if next_start is not None and next_start[0] is not None:
        next_page = next_start[0]
        if 1 <= next_page <= total_pages:
            return next_page
    return min(max(fallback_end_page, 1), total_pages)


def _looks_like_toc_match(page_text: str, start: int, end: int) -> bool:
    line_start = page_text.rfind("\n", 0, start) + 1
    line_end = page_text.find("\n", end)
    if line_end == -1:
        line_end = len(page_text)
    line = page_text[line_start:line_end].strip()
    normalized = " ".join(line.split())

    if re.search(r"\.{3,}\s*\d+\s*$", normalized):
        return True
    compact_page = _compact_heading_search_text(page_text[:1600])
    if (
        re.search(
            r"\b(mục lục|table of contents|contents)\b", page_text[:1200], re.IGNORECASE
        )
        or "mucluc" in compact_page
        or "tableofcontents" in compact_page
    ):
        return True

    after = page_text[end : min(len(page_text), end + 220)]
    after_lines = [
        segment.strip() for segment in after.splitlines()[:4] if segment.strip()
    ]
    if not after_lines:
        return False

    dotted_following = sum(
        bool(re.search(r"\.{3,}\s*\d+\s*$", item)) for item in after_lines
    )
    if dotted_following >= 1:
        return True

    if all(len(item) <= 80 and re.search(r"\d+\s*$", item) for item in after_lines[:2]):
        return True

    return False


def _matches_heading_fuzzy(
    page_text: str, chapter_number: str | None, title: str
) -> bool:
    normalized_page = _normalize_heading_search_text(page_text)
    if not normalized_page:
        return False

    if "mục lục" in normalized_page or "table of contents" in normalized_page:
        return False

    normalized_title = _normalize_heading_search_text(title)
    if normalized_title and normalized_title in normalized_page:
        return True

    if chapter_number:
        chapter_phrase = f"chuong {chapter_number}"
        return chapter_phrase in normalized_page
    return False


def _score_section_start_candidate(
    page_text: str, *, chapter_number: str | None, title: str
) -> int:
    normalized_page = _normalize_heading_search_text(page_text)
    compact_page = _compact_heading_search_text(page_text)
    normalized_title = _normalize_heading_search_text(title)
    compact_title = _compact_heading_search_text(title)
    top_window = normalized_page[:1800]

    score = 0
    if (
        "muc luc" in top_window
        or "mucluc" in compact_page[:1500]
        or "tableofcontents" in compact_page[:1500]
    ):
        score -= 250

    dotted_lines = len(re.findall(r"\.{3,}\s*\d+", page_text[:2000]))
    score -= min(dotted_lines, 8) * 40

    if normalized_title:
        normalized_title_index = normalized_page.find(normalized_title)
        if normalized_title_index >= 0:
            score += max(20, 220 - min(normalized_title_index, 1600) // 8)
    if compact_title:
        compact_title_index = compact_page.find(compact_title)
        if compact_title_index >= 0:
            score += max(40, 360 - min(compact_title_index, 1800) // 4)

    if chapter_number:
        normalized_chapter_phrase = f"chuong {chapter_number}"
        compact_chapter_phrase = f"chuong{chapter_number}"
        normalized_phrase_index = normalized_page.find(normalized_chapter_phrase)
        compact_phrase_index = compact_page.find(compact_chapter_phrase)
        if 0 <= normalized_phrase_index < 800:
            score += 120
        elif normalized_phrase_index >= 0:
            score += 40
        if 0 <= compact_phrase_index < 1200:
            score += max(60, 260 - compact_phrase_index // 5)
        elif compact_phrase_index >= 0:
            score += 40
        section_hits = len(
            re.findall(rf"\b{re.escape(chapter_number)}\.\d", normalized_page[:2500])
        )
        score += min(section_hits, 6) * 25

    return score


def _normalize_heading_search_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.lower()
    normalized = normalized.replace("\n", " ")
    normalized = re.sub(r"(?<=\\b[a-z])\\s+(?=[a-z]\\b)", "", normalized)
    normalized = re.sub(r"\\s+", " ", normalized)
    return normalized.strip()


def _compact_heading_search_text(value: str) -> str:
    normalized = _normalize_heading_search_text(value)
    return re.sub(r"\s+", "", normalized)


def _slice_section_between_positions(
    pages: list[str],
    *,
    start_page: int,
    start_offset: int,
    end_page: int,
    next_start: tuple[int | None, int] | None,
) -> str:
    if start_page < 1 or end_page < start_page:
        return ""

    start_page_index = start_page - 1
    end_page_index = min(end_page - 1, len(pages) - 1)
    out: list[str] = []

    for page_index in range(start_page_index, end_page_index + 1):
        page_text = pages[page_index]
        left = start_offset if page_index == start_page_index else 0
        right = len(page_text)
        if (
            next_start is not None
            and next_start[0] is not None
            and page_index == next_start[0] - 1
        ):
            right = min(right, max(next_start[1], 0))
        if right <= left:
            continue
        out.append(page_text[left:right].strip())

        if (
            next_start is not None
            and next_start[0] is not None
            and page_index >= next_start[0] - 1
        ):
            break

    return "\n".join(part for part in out if part).strip()


def _find_anchor_index(content: str, anchor: str, from_end: bool = False) -> int | None:
    normalized_anchor = " ".join(anchor.split()).strip()
    if not normalized_anchor:
        return None
    direct_index = content.rfind(anchor) if from_end else content.find(anchor)
    if direct_index >= 0:
        return direct_index
    haystack = " ".join(content.split())
    needle = normalized_anchor
    index = haystack.rfind(needle) if from_end else haystack.find(needle)
    if index < 0:
        return None
    return _map_normalized_index(content, haystack, index)


def _map_normalized_index(original: str, normalized: str, target_index: int) -> int:
    if target_index <= 0:
        return 0
    normalized_cursor = 0
    in_whitespace = False
    for original_index, char in enumerate(original):
        if char.isspace():
            if not in_whitespace and normalized_cursor < len(normalized):
                if normalized[normalized_cursor] == " ":
                    normalized_cursor += 1
                in_whitespace = True
            if normalized_cursor >= target_index:
                return original_index
            continue
        in_whitespace = False
        normalized_cursor += 1
        if normalized_cursor >= target_index:
            return original_index
    return len(original)


def _normalize_section_text(value: str) -> str:
    return "\n".join(
        line.strip() for line in value.splitlines() if line.strip()
    ).strip()


def _dedupe_sections(sections: list[dict]) -> list[dict]:
    deduped: list[dict] = []
    seen: set[tuple[str, int | None, int | None]] = set()
    for section in sections:
        signature = (
            section["title"].strip().lower(),
            section.get("page_start"),
            section.get("page_end"),
        )
        if signature in seen:
            continue
        seen.add(signature)
        deduped.append(section)
    return deduped


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        normalized = value.strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(normalized)
    return out


def _is_heading(line: str, style_name: str | None = None) -> bool:
    normalized = unicodedata.normalize("NFKC", line).strip()
    style = (style_name or "").lower()
    if style and any(token in style for token in ("heading", "title", "subtitle")):
        return True
    return bool(
        _CHAPTER_RE.match(normalized)
        or _SECTION_RE.match(normalized)
        or (_TITLE_CASE_RE.match(normalized) and len(normalized.split()) <= 12)
    )


def _find_page_index(
    content_text: str, pages: list[str] | None, from_end: bool = False
) -> int | None:
    if not pages or not content_text.strip():
        return None
    target = content_text.strip()[:180]
    iterable = range(len(pages) - 1, -1, -1) if from_end else range(len(pages))
    for index in iterable:
        page = pages[index]
        if target[:80] in page or page[:80] in target:
            return index + 1
    return None


def _sanitize_filename(file_name: str) -> str:
    name = Path(file_name).name
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
    return safe[:180] or "document"


def _unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.stem
    suffix = path.suffix
    for index in range(1, 1000):
        candidate = path.with_name(f"{stem}_{index}{suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError("Unable to allocate upload path")
