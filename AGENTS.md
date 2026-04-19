# SmartLearn AI Agents & Use Cases

This document describes the AI modules in SmartLearn and which use cases they serve.

## Automated Question Generation (AQG) Agent

Uses Hugging Face Transformers to turn curated chapter text into quiz questions.

- **Use Case**: UC-05 (Tạo câu hỏi tự động từ tài liệu)
- **What it does**:
    - Parses chapter content using Transformer models to extract entities and key concepts.
    - Generates three question formats: Multiple Choice, Multiple Select, Fill-in-the-blank.
    - Attaches source metadata to each question — the original text segment and page number.

---

## Document Understanding & Structure Extraction Agent

AI-powered document parsing that builds a reliable content hierarchy out of uploaded files.

- **Use Case**: UC-03 (Upload tài liệu & Phân tích cấu trúc)
- **What it does**:
    - Reads PDF/DOCX files and extracts clean text.
    - Infers chapter/section boundaries semantically and preserves source/page metadata for accurate downstream question generation.
    - Allows the user to review and correct the proposed structure before saving when confidence is low.

---

## Supporting Modules (non-AI)

These are standard application features that work alongside the AI parsing and AQG agents but do not use machine learning or NLP themselves.

### Citation Linker — UC-08 (Xem nguồn trích dẫn)

Metadata lookup. Each question stores a reference to its source passage and page number (written by the AQG agent at generation time). This module retrieves that reference and highlights the relevant paragraph in the document viewer.

### Mistake Review — UC-11 (Ôn tập câu sai)

Database filtering. Queries `user_answers` for rows where `is_correct = FALSE`, groups them by chapter, and presents them as a review session. Marks a question as recovered when the user answers it correctly on retry.

---

## How They Connect

1. **Document Understanding & Structure Extraction Agent** processes the uploaded PDF/DOCX → structured chapters with clean text and citation metadata.
2. **AQG Agent** reads a selected chapter → generates questions with source citations.
3. **Citation Linker** surfaces the source passage → shown as feedback after each answer.
4. **Mistake Review** collects wrong answers → builds review sessions from the question pool.
