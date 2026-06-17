"""Text cleaning utilities for extracted PDF/DOCX page text.

The parsing pipeline reconstructs chapter content by slicing the per-page text
returned by the extractors. This module removes the "noise" that PDF/DOCX text
extraction introduces — running headers/footers, scattered page numbers,
line-wrap hyphenation, broken mid-sentence lines, and orphan control glyphs —
*before* chapter boundaries are located, so character offsets stay consistent
with what ``document_processing._find_section_start`` later searches.

Two hard constraints from the surrounding code:

1. **TOC markers must survive on table-of-contents pages.** ``document_processing``
   demotes TOC pages by detecting dotted-leader runs ("Chương 1 ...... 9") and
   trailing page numbers. If we stripped those, a chapter could be anchored to
   its TOC entry. We therefore detect TOC pages on the *raw* text first and leave
   them essentially untouched.
2. **Real chapter/section headings must not be deleted as running headers.**
   Vietnamese academic PDFs frequently repeat the chapter title in the running
   header of every page of that chapter, so a naive "recurs on most pages" filter
   would delete the exact anchor line. Lines matching a heading pattern are exempt.
"""

import re
import unicodedata

# Mirrors the heading patterns in document_processing (kept local to avoid a
# circular import, since document_processing imports this module). Broadened to
# cover Vietnamese structural words used as headings.
_HEADING_EXEMPT_RE = re.compile(
    r"^\s*(chapter|chương|phần|bài|mục)\s+[\wivxlcdm]+\b",
    re.IGNORECASE,
)
_SECTION_EXEMPT_RE = re.compile(r"^\s*(\d+(\.\d+){0,3}|[IVXLC]{1,8})[.)]?\s+\S+")
# Top-level chapter headings only ("Chương 1", "Chapter II", "Phần 3").
# Deliberately excludes decimal subsection numbers like "1.5.6".
_CHAPTER_HEADING_RE = re.compile(
    r"^\s*(chương|chapter|phần)\s+(\d{1,3}|[ivxlcdm]{1,7})\b",
    re.IGNORECASE,
)

# Standalone page-number lines: "12", "- 12 -", "Trang 12", "Page 12", "12/340".
_PAGE_NUMBER_RE = re.compile(
    r"^\s*(?:[-–—|]\s*)?(?:trang|page|p\.?)?\s*\d{1,4}\s*(?:/\s*\d{1,4})?\s*(?:[-–—|])?\s*$",
    re.IGNORECASE,
)
# Dotted-leader TOC entries: "Chương 1. Biến cố ............ 9".
_DOTTED_LEADER_RE = re.compile(r"\.{3,}\s*\d+\s*$")
_TOC_HEADER_RE = re.compile(r"\b(mục lục|table of contents|contents)\b", re.IGNORECASE)

# Hyphen used at end of a wrapped line, joining two word fragments.
_DEHYPHEN_RE = re.compile(r"([^\W\d_])-\n([^\W\d_])", re.UNICODE)
# Control chars except tab/newline, plus the Unicode replacement char and
# zero-width / BOM artifacts.
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f�​‌‍﻿]")

DEFAULT_MARGIN_LINES = 2
DEFAULT_HEADER_THRESHOLD = 0.6


def is_heading_line(line: str) -> bool:
    """True when a line looks like a chapter/section heading (exempt from removal)."""
    normalized = unicodedata.normalize("NFKC", line).strip()
    if not normalized:
        return False
    return bool(
        _HEADING_EXEMPT_RE.match(normalized) or _SECTION_EXEMPT_RE.match(normalized)
    )


_ROMAN_VALUES = {"i": 1, "v": 5, "x": 10, "l": 50, "c": 100, "d": 500, "m": 1000}


def chapter_marker(line: str) -> tuple[int, str] | None:
    """If a line is a top-level chapter heading, return (chapter_number, title).

    Recognizes "Chương N", "Chapter N", "Phần N" with Arabic or Roman numerals.
    Decimal subsection headings ("1.5.6 ...") are intentionally NOT matched, so
    segmentation stays at chapter granularity.
    """
    normalized = unicodedata.normalize("NFKC", line).strip()
    if not normalized or len(normalized) > 160:
        return None
    # Headings are capitalized ("Chương"/"CHƯƠNG"); a lowercase "chương"/"phần"
    # is mid-sentence prose (e.g. "thành phần X"), not a chapter start.
    if not normalized[0].isupper():
        return None
    match = _CHAPTER_HEADING_RE.match(normalized)
    if not match:
        return None
    number = _parse_chapter_number(match.group(2))
    if number is None:
        return None
    return number, normalized


def _parse_chapter_number(token: str) -> int | None:
    if token.isdigit():
        return int(token)
    token = token.lower()
    if not all(char in _ROMAN_VALUES for char in token):
        return None
    total = 0
    previous = 0
    for char in reversed(token):
        value = _ROMAN_VALUES[char]
        total += -value if value < previous else value
        previous = max(previous, value)
    return total or None


def detect_toc_pages(pages: list[str]) -> set[int]:
    """Return indices of pages that look like a table of contents (raw text).

    Detected on the *raw* page text so the markers used for detection are still
    present when ``document_processing`` later scores/demotes these pages.
    """
    toc: set[int] = set()
    for index, page in enumerate(pages):
        lines = [line.strip() for line in page.splitlines() if line.strip()]
        dotted = sum(1 for line in lines if _DOTTED_LEADER_RE.search(line))
        header = bool(_TOC_HEADER_RE.search(page[:400]))
        if dotted >= 3 or (header and dotted >= 1):
            toc.add(index)
    return toc


def _normalize_for_match(line: str) -> str:
    """Accent/whitespace-insensitive key for matching recurring header/footer lines."""
    decomposed = unicodedata.normalize("NFKD", line)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    # Drop digits so "Page 3" / "Page 4" headers collapse to the same key.
    stripped = re.sub(r"\d+", "", stripped)
    return re.sub(r"\s+", " ", stripped).strip().lower()


def strip_running_headers_footers(
    pages: list[str],
    *,
    margin_lines: int = DEFAULT_MARGIN_LINES,
    threshold: float = DEFAULT_HEADER_THRESHOLD,
    skip_indices: set[int] | None = None,
) -> list[str]:
    """Remove lines that recur in the top/bottom margin band of most pages.

    Only the first/last ``margin_lines`` non-empty lines of each page are
    candidates. A normalized line removed only if it appears in the margin band
    of ``>= threshold`` of pages AND is not a heading line.
    """
    skip = skip_indices or set()
    eligible = [i for i in range(len(pages)) if i not in skip]
    if len(eligible) < 4:
        return list(pages)

    counts: dict[str, int] = {}
    for index in eligible:
        margin = _margin_lines(pages[index], margin_lines)
        for line in {_normalize_for_match(line) for line in margin}:
            if line:
                counts[line] = counts.get(line, 0) + 1

    cutoff = max(2, int(round(threshold * len(eligible))))
    recurring = {key for key, count in counts.items() if count >= cutoff}
    if not recurring:
        return list(pages)

    cleaned: list[str] = []
    for index, page in enumerate(pages):
        if index in skip:
            cleaned.append(page)
            continue
        lines = page.splitlines()
        band = _margin_line_positions(lines, margin_lines)
        kept: list[str] = []
        for pos, line in enumerate(lines):
            if (
                pos in band
                and _normalize_for_match(line) in recurring
                and not is_heading_line(line)
            ):
                continue
            kept.append(line)
        cleaned.append("\n".join(kept))
    return cleaned


def _margin_lines(page: str, margin_lines: int) -> list[str]:
    lines = [line for line in page.splitlines() if line.strip()]
    if not lines:
        return []
    return lines[:margin_lines] + lines[-margin_lines:]


def _margin_line_positions(lines: list[str], margin_lines: int) -> set[int]:
    """Indices (into ``lines``) of the first/last ``margin_lines`` non-empty lines."""
    non_empty = [pos for pos, line in enumerate(lines) if line.strip()]
    if not non_empty:
        return set()
    return set(non_empty[:margin_lines]) | set(non_empty[-margin_lines:])


def strip_page_numbers(page: str) -> str:
    """Drop standalone page-number lines anywhere in the page.

    Page numbers leak both into the margin band (running footers) and scattered
    into the body during PDF text extraction, so removal is global. Only lines
    that are *entirely* a page-number marker (bare number, "Trang N", "Page N",
    "12/340") are removed — content lines that merely contain a number survive.
    """
    return "\n".join(
        line for line in page.splitlines() if not _PAGE_NUMBER_RE.match(line)
    )


def dehyphenate(text: str) -> str:
    """Join words split by a hyphen at a line wrap. Intra-page only (no page joins)."""
    return _DEHYPHEN_RE.sub(r"\1\2", text)


def reflow_paragraphs(text: str) -> str:
    """Merge mid-sentence broken lines into paragraphs.

    A line is joined to the previous one when the previous line does not end with
    sentence punctuation and the current line is not a heading or a list/blank
    marker. Blank lines (paragraph breaks) and headings are preserved.
    """
    lines = text.splitlines()
    out: list[str] = []
    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            out.append("")
            continue
        if (
            out
            and out[-1].strip()
            and not is_heading_line(line)
            and not is_heading_line(out[-1])
            and not re.match(r"^\s*([-*•]|\d+[.)])\s", line)
            and not re.search(r"[.!?:;…]['\"”’)]?\s*$", out[-1])
        ):
            out[-1] = f"{out[-1].rstrip()} {line.strip()}"
        else:
            out.append(line)
    return "\n".join(out)


def strip_control_glyphs(text: str) -> str:
    """Remove control characters and common encoding artifacts."""
    return _CONTROL_RE.sub("", text)


def clean_page_text(page: str) -> str:
    """Full per-page cleaning pipeline for a non-TOC page."""
    page = strip_control_glyphs(page)
    page = strip_page_numbers(page)
    page = dehyphenate(page)
    page = reflow_paragraphs(page)
    return _collapse_blank_lines(page)


def clean_pages(pages: list[str]) -> list[str]:
    """Clean a document's pages while preserving page count and TOC markers.

    1. Detect TOC pages on raw text.
    2. Strip recurring running headers/footers (TOC pages skipped, headings exempt).
    3. Full per-page cleaning for non-TOC pages; TOC pages get only control-glyph
       removal so their dotted-leader/page-number markers survive for scoring.
    """
    if not pages:
        return pages
    toc_pages = detect_toc_pages(pages)
    pages = strip_running_headers_footers(pages, skip_indices=toc_pages)
    cleaned: list[str] = []
    for index, page in enumerate(pages):
        if index in toc_pages:
            cleaned.append(strip_control_glyphs(page))
        else:
            cleaned.append(clean_page_text(page))
    return cleaned


def clean_section_text(text: str) -> str:
    """Final cleaning pass for assembled section content."""
    text = strip_control_glyphs(text)
    text = dehyphenate(text)
    text = reflow_paragraphs(text)
    return _collapse_blank_lines(text)


def _collapse_blank_lines(text: str) -> str:
    lines = [line.rstrip() for line in text.splitlines()]
    out: list[str] = []
    for line in lines:
        if not line and out and not out[-1]:
            continue
        out.append(line)
    return "\n".join(out).strip()
