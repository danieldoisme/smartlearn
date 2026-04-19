import base64
import re
import unicodedata
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from backend.app.models.enums import FileType

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


def parse_document(file_type: FileType, content: bytes, title: str) -> list[dict]:
    if file_type == FileType.DOCX:
        sections = _parse_docx_sections(content, title)
        if sections:
            return sections
    if file_type == FileType.PDF:
        pages = _extract_pdf_pages(content)
        if pages:
            return split_into_chapters(title, "\n".join(pages), pages=pages)
    extracted = extract_text(file_type, content)
    return split_into_chapters(title, extracted)


def extract_text(file_type: FileType, content: bytes) -> str:
    if file_type == FileType.DOCX:
        return _extract_docx_text(content)
    if file_type == FileType.PDF:
        return _extract_pdf_text(content)
    return ""


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
