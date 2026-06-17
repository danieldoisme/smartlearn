"""Unit tests for text_cleaning — deterministic, no network."""

from backend.app.services import text_cleaning as tc


def test_running_header_repeating_chapter_title_survives():
    # VN academic PDFs repeat the chapter title in every page header; it must NOT
    # be stripped as a running header because it is the boundary anchor.
    pages = [
        f"Chương 2. Biến cố ngẫu nhiên\nNội dung trang {i} với nhiều câu chữ học thuật."
        for i in range(1, 9)
    ]
    cleaned = tc.clean_pages(pages)
    assert all("Chương 2. Biến cố ngẫu nhiên" in page for page in cleaned)


def test_running_non_heading_header_removed():
    bodies = [
        "Phép thử ngẫu nhiên là khái niệm nền tảng của xác suất.",
        "Không gian mẫu là tập hợp mọi kết quả có thể xảy ra.",
        "Biến cố là một tập con của không gian mẫu được xét.",
        "Xác suất cổ điển dựa trên giả thiết đồng khả năng.",
        "Định nghĩa thống kê của xác suất dựa trên tần suất.",
        "Định nghĩa hình học áp dụng cho không gian liên tục.",
        "Tiên đề Kolmogorov xây dựng nền tảng tiên đề hóa.",
        "Công thức cộng và nhân xác suất được trình bày sau.",
    ]
    pages = [f"Giáo trình Xác suất Thống kê\n{body}" for body in bodies]
    cleaned = tc.clean_pages(pages)
    assert not any("Giáo trình Xác suất Thống kê" in page for page in cleaned)
    assert all(body in page for body, page in zip(bodies, cleaned))


def test_toc_page_detected_and_markers_preserved():
    toc = (
        "MỤC LỤC\n"
        "Chương 1. Biến cố và xác suất ............ 9\n"
        "Chương 2. Đại lượng ngẫu nhiên ........ 37\n"
        "Chương 3. Luật số lớn ................... 80\n"
    )
    body = "Chương 1. Biến cố và xác suất\nNội dung chương một."
    pages = [toc, body]
    assert tc.detect_toc_pages(pages) == {0}
    cleaned = tc.clean_pages(pages)
    # Dotted-leader markers survive so downstream TOC demotion still works.
    assert "............ 9" in cleaned[0] or "...." in cleaned[0]


def test_dehyphenate_intra_page_only():
    assert tc.dehyphenate("nghi-\nệm") == "nghiệm"
    # Numbers are not joined (could be ranges/list markers).
    assert tc.dehyphenate("10-\n20") == "10-\n20"


def test_dehyphenate_does_not_cross_pages():
    # clean_pages operates per page; a fragment at end of page must not merge
    # with the next page's start.
    pages = ["một từ bị ngắt nghi-", "ệm ở trang sau"]
    cleaned = tc.clean_pages(pages)
    assert "nghiệm" not in (cleaned[0] + "||" + cleaned[1]).replace("||", "")


def test_standalone_page_numbers_removed():
    page = "12\nNội dung thực sự của trang này.\nTrang 13"
    cleaned = tc.clean_page_text(page)
    assert "Nội dung thực sự" in cleaned
    assert "\n12" not in ("\n" + cleaned)
    assert "Trang 13" not in cleaned


def test_control_glyphs_stripped():
    assert tc.strip_control_glyphs("a\x00b�c​d") == "abcd"


def test_reflow_merges_broken_sentence_lines():
    text = "Đây là một câu bị\nngắt thành hai dòng.\n\nĐoạn mới."
    out = tc.reflow_paragraphs(text)
    assert "Đây là một câu bị ngắt thành hai dòng." in out
    assert "Đoạn mới." in out


def test_content_loss_bounded():
    # Cleaning must not eat the bulk of real body text.
    pages = [
        "Header lặp lại\n"
        + "\n".join(
            f"Dòng {p}.{i} nội dung học thuật quan trọng và khác biệt."
            for i in range(40)
        )
        + f"\n{p}"
        for p in range(1, 7)
    ]
    raw_chars = sum(len(p) for p in pages)
    cleaned = tc.clean_pages(pages)
    kept_chars = sum(len(p) for p in cleaned)
    assert kept_chars >= 0.8 * raw_chars
