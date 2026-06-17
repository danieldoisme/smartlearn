"""Integration test: parse_document on the real fixture with mocked Gemini."""

import json
import re

import httpx
import respx

from backend.app.config import settings
from backend.app.models.enums import FileType
from backend.app.services import document_processing as dp

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{settings.GEMINI_MODEL}:generateContent"
)
_PAGE_NUMBER_LINE = re.compile(r"^\s*\d{1,4}\s*$")


def _sections_response(page_count: int) -> httpx.Response:
    body = {
        "confidence": 0.9,
        "review_required": False,
        "warnings": [],
        "sections": [
            {
                "title": "Chương 1. Biến cố và xác suất",
                "page_start": 1,
                "page_end": max(1, page_count // 2),
            },
            {
                "title": "Chương 2. Đại lượng ngẫu nhiên",
                "page_start": max(1, page_count // 2),
                "page_end": page_count,
            },
        ],
    }
    payload = {"candidates": [{"content": {"parts": [{"text": json.dumps(body)}]}}]}
    return httpx.Response(200, json=payload)


@respx.mock
async def test_parse_document_clean_and_no_tail_loss(vn_pdf_bytes, monkeypatch):
    monkeypatch.setattr(settings, "AI_PARSER_LONGDOC_MODE", True)
    pages = dp.clean_pages(dp.extract_pages(FileType.PDF, vn_pdf_bytes))
    page_count = len(pages)
    respx.post(_GEMINI_URL).mock(return_value=_sections_response(page_count))

    result = await dp.parse_document(FileType.PDF, vn_pdf_bytes, "Xác suất Thống kê")

    assert result.parser_mode == "ai"
    assert result.sections, "expected AI sections"
    # Tail not lost: a section reaches the final page.
    assert max(s["page_end"] for s in result.sections) == page_count
    # No standalone page-number lines left inside section content.
    for section in result.sections:
        for line in section["content_text"].splitlines():
            assert not _PAGE_NUMBER_LINE.match(line), f"page number leaked: {line!r}"
    # Chapter anchor survived cleaning.
    assert any("Chương" in s["title"] for s in result.sections)
