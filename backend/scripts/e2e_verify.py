#!/usr/bin/env python3
"""End-to-end integration check for SmartLearn local stack.

Exercises both AI pipelines against the running backend + native MySQL:
  1. auth register/login        -> MySQL read/write
  2. POST /documents/preview    -> ai_document_parsing.infer_document_structure
  3. POST /documents            -> full parse + DB write (document + chapters)
  4. POST /chapters/{id}/generate-questions -> question_generation (gemini-3.1-pro)
  5. GET  /chapters/{id}/questions          -> Pydantic unpack of stored rows

Run (host -> container port mapping):
    uv run --project backend python backend/scripts/e2e_verify.py

Override base URL / creds via env:
    BASE_URL=http://localhost:8080 TEST_EMAIL=... TEST_PASSWORD=... uv run ...
"""

from __future__ import annotations

import base64
import io
import os
import sys
import traceback
import zipfile

import httpx

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
TEST_EMAIL = os.environ.get("TEST_EMAIL", "e2e_tester@example.com")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "Test1234!")
TEST_NAME = os.environ.get("TEST_NAME", "E2E Tester")
TIMEOUT = float(os.environ.get("E2E_TIMEOUT", "300"))

GREEN, RED, YELLOW, DIM, RESET = (
    "\033[32m",
    "\033[31m",
    "\033[33m",
    "\033[2m",
    "\033[0m",
)


def ok(msg: str) -> None:
    print(f"{GREEN}PASS{RESET} {msg}")


def warn(msg: str) -> None:
    print(f"{YELLOW}WARN{RESET} {msg}")


def step(msg: str) -> None:
    print(f"\n{DIM}== {msg} =={RESET}")


def fail(msg: str, resp: httpx.Response | None = None) -> None:
    print(f"{RED}FAIL{RESET} {msg}")
    if resp is not None:
        print(f"{RED}  status={resp.status_code}{RESET}")
        body = resp.text
        print(f"{RED}  body={body[:2000]}{RESET}")
    sys.exit(1)


def build_sample_docx() -> bytes:
    """Minimal valid .docx with headings + conceptual Vietnamese content.

    Rich definition-style sentences give question_generation strong passages
    so the gemini path has real material to work with.
    """
    paragraphs = [
        "Chương 1: Khái niệm cơ bản về cơ sở dữ liệu",
        "Cơ sở dữ liệu là một tập hợp dữ liệu có cấu trúc được lưu trữ và truy cập "
        "bằng phương tiện điện tử nhằm phục vụ nhiều người dùng đồng thời.",
        "Hệ quản trị cơ sở dữ liệu là phần mềm cho phép người dùng định nghĩa, tạo "
        "lập, duy trì và kiểm soát quyền truy cập vào cơ sở dữ liệu một cách an toàn.",
        "Khóa chính là một thuộc tính hoặc tập thuộc tính dùng để xác định duy nhất "
        "mỗi bản ghi trong một bảng quan hệ và không được phép nhận giá trị rỗng.",
        "Chương 2: Mô hình quan hệ và ràng buộc toàn vẹn",
        "Khóa ngoại là thuộc tính trong một bảng tham chiếu đến khóa chính của bảng "
        "khác, dùng để thiết lập và duy trì mối quan hệ giữa hai bảng dữ liệu.",
        "Ràng buộc toàn vẹn tham chiếu quy định rằng giá trị của khóa ngoại phải khớp "
        "với một giá trị khóa chính đang tồn tại hoặc nhận giá trị rỗng hợp lệ.",
        "Chuẩn hóa là quá trình tổ chức các thuộc tính và bảng nhằm giảm thiểu dư "
        "thừa dữ liệu và loại bỏ các bất thường khi thêm, sửa và xóa dữ liệu.",
    ]

    body_parts = []
    for text in paragraphs:
        safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        body_parts.append(
            '<w:p><w:r><w:t xml:space="preserve">' + safe + "</w:t></w:r></w:p>"
        )

    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>" + "".join(body_parts) + "</w:body></w:document>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml"/></Relationships>'
    )

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("word/document.xml", document_xml)
    return buffer.getvalue()


def main() -> None:
    print(f"{DIM}BASE_URL={BASE_URL}  email={TEST_EMAIL}{RESET}")
    client = httpx.Client(base_url=BASE_URL, timeout=TIMEOUT)

    # 1. Auth: register (idempotent -> login on 409) -------------------------
    step("1. Auth register/login (MySQL read/write)")
    resp = client.post(
        "/auth/register",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "fullName": TEST_NAME},
    )
    if resp.status_code == 409:
        warn("user exists, logging in instead")
        resp = client.post(
            "/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
    if resp.status_code not in (200, 201):
        fail("auth failed", resp)
    token = resp.json().get("accessToken")
    if not token:
        fail("no accessToken in auth response", resp)
    user_id = resp.json().get("user", {}).get("id")
    ok(f"authenticated user id={user_id}")
    client.headers["Authorization"] = f"Bearer {token}"

    # Prepare sample document ------------------------------------------------
    docx_bytes = build_sample_docx()
    payload_b64 = base64.b64encode(docx_bytes).decode("ascii")
    upload = {
        "fileName": "e2e_sample.docx",
        "fileContentBase64": payload_b64,
        "title": "E2E Sample - Co so du lieu",
    }

    # 2. Document preview -> ai_document_parsing -----------------------------
    step("2. POST /documents/preview (ai_document_parsing)")
    resp = client.post("/documents/preview", json=upload)
    if resp.status_code != 200:
        fail("preview failed", resp)
    preview = resp.json()
    ok(
        f"parser_mode={preview.get('parserMode')} "
        f"chapters={preview.get('chapterCount')} "
        f"confidence={preview.get('confidence')} "
        f"totalChars={preview.get('totalChars')}"
    )
    if preview.get("parserMode") == "ai":
        ok("ai_document_parsing returned a usable AI structure")
    else:
        warn(
            "parser fell back (gemini parse unavailable or low-signal); "
            f"warnings={preview.get('warnings')}"
        )

    # 3. Create document -> full parse + DB write ----------------------------
    step("3. POST /documents (parse + DB write)")
    resp = client.post("/documents", json=upload)
    if resp.status_code != 201:
        fail("document create failed", resp)
    document = resp.json()
    document_id = document["id"]
    ok(f"document persisted id={document_id} fileType={document.get('fileType')}")

    # Read back chapters (need chapter ids) ----------------------------------
    resp = client.get(f"/documents/{document_id}")
    if resp.status_code != 200:
        fail("document detail fetch failed", resp)
    detail = resp.json()
    chapters = detail.get("chapters", [])
    if not chapters:
        fail("no chapters persisted for document", resp)
    chapter = max(chapters, key=lambda c: len(c.get("contentText") or ""))
    chapter_id = chapter["id"]
    ok(
        f"persisted {len(chapters)} chapters; "
        f"target chapter id={chapter_id} "
        f"contentChars={len(chapter.get('contentText') or '')}"
    )

    # 4. Generate questions -> question_generation (gemini-3.1-pro) ----------
    step("4. POST /chapters/{id}/generate-questions (gemini-3.1-pro)")
    resp = client.post(
        f"/chapters/{chapter_id}/generate-questions",
        json={"questionType": "mixed", "count": 5},
    )
    if resp.status_code != 201:
        fail("question generation failed", resp)
    gen = resp.json()
    ok(
        f"provider={gen.get('provider')} "
        f"created={gen.get('createdCount')} "
        f"requested={gen.get('requestedCount')} "
        f"usedFallback={gen.get('usedFallback')}"
    )
    if gen.get("warnings"):
        warn(f"generation warnings: {gen.get('warnings')}")
    if gen.get("provider") == "ai":
        ok("gemini-3.1-pro payload validated + Pydantic schema unpacked cleanly")
    else:
        warn(
            "gemini path did not yield questions; local fallback generator used. "
            "Check GEMINI_API_KEY / GEMINI_MODEL if 'ai' provider was expected."
        )

    # 5. Read back questions -> confirm schema unpack ------------------------
    step("5. GET /chapters/{id}/questions (schema unpack)")
    resp = client.get(f"/chapters/{chapter_id}/questions")
    if resp.status_code != 200:
        fail("question list fetch failed", resp)
    questions = resp.json()
    if not questions:
        fail("no questions stored after generation", resp)
    sample = questions[0]
    ok(
        f"stored {len(questions)} questions; "
        f"sample type={sample.get('questionType')} "
        f"options={len(sample.get('options') or [])}"
    )

    print(f"\n{GREEN}E2E VERIFICATION PASSED{RESET}")
    client.close()


if __name__ == "__main__":
    try:
        main()
    except httpx.HTTPError as exc:
        print(f"\n{RED}TRANSPORT ERROR{RESET}: {exc}")
        traceback.print_exc()
        sys.exit(1)
    except Exception:
        print(f"\n{RED}UNHANDLED EXCEPTION{RESET}")
        traceback.print_exc()
        sys.exit(1)
