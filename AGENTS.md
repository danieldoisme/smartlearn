# SmartLearn AI Agents & Use Cases

This document describes the AI modules in SmartLearn and which use cases they serve.

## Automated Question Generation (AQG) Agent

The only AI-powered module in the system. Uses Hugging Face Transformers to turn chapter text into quiz questions.

- **Use Case**: UC-05 (Tạo câu hỏi tự động từ tài liệu)
- **What it does**:
    - Parses chapter content using Transformer models to extract entities and key concepts.
    - Generates three question formats: Multiple Choice, Multiple Select, Fill-in-the-blank.
    - Attaches source metadata to each question — the original text segment and page number.

---

## Supporting Modules (non-AI)

These are standard application features that work alongside the AQG agent but do not use machine learning or NLP themselves.

### Document Parser — UC-03 (Upload tài liệu & Phân tích cấu trúc)

Rule-based structural analysis. Reads PDF/DOCX files, identifies chapters/sections from logical markers (headings, page breaks), extracts clean text, and builds a content hierarchy. This clean text is what the AQG agent consumes.

### Citation Linker — UC-08 (Xem nguồn trích dẫn)

Metadata lookup. Each question stores a reference to its source passage and page number (written by the AQG agent at generation time). This module retrieves that reference and highlights the relevant paragraph in the document viewer.

### Mistake Review — UC-11 (Ôn tập câu sai)

Database filtering. Queries `user_answers` for rows where `is_correct = FALSE`, groups them by chapter, and presents them as a review session. Marks a question as recovered when the user answers it correctly on retry.

---

## How They Connect

1. **Document Parser** processes the uploaded PDF → structured chapters with clean text.
2. **AQG Agent** reads a selected chapter → generates questions with source citations.
3. **Citation Linker** surfaces the source passage → shown as feedback after each answer.
4. **Mistake Review** collects wrong answers → builds review sessions from the question pool.
