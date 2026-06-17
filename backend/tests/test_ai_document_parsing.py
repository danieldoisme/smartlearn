"""Tests for long-doc AI structure inference (mocked Gemini, no network)."""

import json

import httpx
import respx

from backend.app.config import settings
from backend.app.models.enums import FileType
from backend.app.services import ai_document_parsing as ai

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{settings.GEMINI_MODEL}:generateContent"
)


def _gemini_response(sections: list[dict]) -> httpx.Response:
    body = {
        "confidence": 0.9,
        "review_required": False,
        "warnings": [],
        "sections": sections,
    }
    payload = {"candidates": [{"content": {"parts": [{"text": json.dumps(body)}]}}]}
    return httpx.Response(200, json=payload)


# ---- pure helpers (no network) ------------------------------------------------


def test_candidate_compression_shrinks_payload():
    pages = [
        "Chương 1. Mở đầu\n" + "\n".join(f"dòng nội dung {i}" for i in range(60))
        for _ in range(5)
    ]
    full = "\n\n".join(pages)
    items = [(i + 1, p) for i, p in enumerate(pages)]
    compressed = ai._build_candidate_payload(items, context_lines=2)
    assert len(compressed) < len(full)
    assert "Chương 1. Mở đầu" in compressed


def test_windows_each_fit_budget():
    pages = [f"Chương {i}. Tiêu đề\n" + "x " * 4000 for i in range(1, 20)]
    windows = ai._build_candidate_windows(pages, context_lines=1)
    assert len(windows) >= 2
    assert all(ai._fits_budget(w) for w in windows)


def test_merge_dedupes_seam_sections():
    b = ai.AISectionBoundary
    merged = ai._merge_section_boundaries(
        [
            b(title="Chương 1", page_start=1, page_end=5),
            b(title="Chương 1", page_start=1, page_end=5),  # exact dup
            b(title="Chương 1", page_start=1, page_end=9),  # seam overlap
            b(title="Chương 2", page_start=6, page_end=12),
        ]
    )
    titles = [(m.title, m.page_start) for m in merged]
    assert titles == [("Chương 1", 1), ("Chương 2", 6)]


def test_chapter_first_segmentation_not_oversplit():
    # Subsection headings must NOT create their own chapters.
    pages = [
        "MỤC LỤC\nChương 1 ........ 1\nChương 2 ........ 5",  # TOC, ignored
        "Chương 1\nBiến cố và xác suất\n1.1. Phép thử\nnội dung",
        "1.2. Không gian mẫu\n1.5.6. Sự độc lập\nnội dung tiếp",
        "Chương 2\nBiến ngẫu nhiên\n2.1. Định nghĩa\nnội dung",
        "2.2.1. Kỳ vọng\nnội dung cuối",
    ]
    sections = ai._detect_chapter_boundaries(pages)
    assert len(sections) == 2
    assert sections[0].title.startswith("Chương 1")
    assert "Biến cố" in sections[0].title  # continuation merged
    assert sections[0].page_start == 2 and sections[0].page_end == 3
    assert sections[1].page_start == 4 and sections[1].page_end == 5


def test_chapter_marker_rejects_lowercase_and_subsections():
    from backend.app.services.text_cleaning import chapter_marker

    assert chapter_marker("Chương 1. Mở đầu")[0] == 1
    assert chapter_marker("CHƯƠNG II Tổng quan")[0] == 2
    assert chapter_marker("thành phần X của hệ") is None  # lowercase prose
    assert chapter_marker("1.5.6. Sự độc lập") is None  # subsection


def test_chapter_detection_needs_two_chapters():
    pages = ["Chương 1\nNội dung", "không có chương nào"]
    assert ai._detect_chapter_boundaries(pages) == []


# ---- mocked end-to-end --------------------------------------------------------


@respx.mock
async def test_longdoc_single_call_no_tail_loss(monkeypatch):
    monkeypatch.setattr(settings, "AI_PARSER_LONGDOC_MODE", True)
    # No explicit chapter markers -> exercises the AI inference path.
    pages = [f"1.{i}. Mục nhỏ {i}\nNội dung trang {i}." for i in range(1, 6)]
    route = respx.post(_GEMINI_URL).mock(
        return_value=_gemini_response(
            [
                {"title": "Phần đầu", "page_start": 1, "page_end": 2},
                {"title": "Phần cuối", "page_start": 5, "page_end": 5},
            ]
        )
    )
    outcome = await ai.infer_document_structure(
        file_type=FileType.PDF, document_title="Doc", pages=pages
    )
    assert route.called
    assert outcome.suggestion is not None
    last = max(s.page_end for s in outcome.suggestion.sections)
    assert last == len(pages)  # tail page covered


@respx.mock
async def test_longdoc_windowed_merges_all_windows(monkeypatch):
    monkeypatch.setattr(settings, "AI_PARSER_LONGDOC_MODE", True)
    # Force tiny budget so every page becomes its own window.
    monkeypatch.setattr(settings, "AI_PARSER_MAX_CHARS", 30)
    monkeypatch.setattr(settings, "AI_PARSER_MAX_INPUT_TOKENS", 10)
    # No chapter markers -> forces candidate/windowing path.
    pages = [f"{i}.1. Tiêu đề {i}\nNội dung." for i in range(1, 5)]
    # Each windowed call returns its own section (absolute page numbers).
    responses = [
        _gemini_response([{"title": f"Chương {i}", "page_start": i, "page_end": i}])
        for i in range(1, 5)
    ]
    respx.post(_GEMINI_URL).mock(side_effect=responses)
    outcome = await ai.infer_document_structure(
        file_type=FileType.PDF, document_title="Doc", pages=pages
    )
    assert outcome.suggestion is not None
    starts = sorted(s.page_start for s in outcome.suggestion.sections)
    assert starts == [1, 2, 3, 4]  # no window dropped
    assert outcome.suggestion.review_required is True


@respx.mock
async def test_flag_off_uses_full_text_path(monkeypatch):
    monkeypatch.setattr(settings, "AI_PARSER_LONGDOC_MODE", False)
    pages = ["Chương 1. A\nnội dung", "Chương 2. B\nnội dung"]
    route = respx.post(_GEMINI_URL).mock(
        return_value=_gemini_response(
            [{"title": "Chương 1. A", "page_start": 1, "page_end": 2}]
        )
    )
    outcome = await ai.infer_document_structure(
        file_type=FileType.PDF, document_title="Doc", pages=pages
    )
    assert route.called
    assert outcome.suggestion is not None
