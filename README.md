# SmartLearn

A web-based learning platform that uses AI to understand uploaded documents (PDF, DOCX) and generate quiz questions from the most relevant learning segments. Students upload their study materials, the system extracts chapter/section structure with AI-assisted parsing, and the question-generation module produces questions tied back to the source text.

## Features

- **Document Upload & Parsing** — Upload PDF/DOCX files. An AI-powered parsing pipeline extracts clean text, identifies chapters/sections semantically, preserves citation metadata, and still allows manual correction when needed.
- **Question Generation** — Generates multiple-choice, select-many, and fill-in-the-blank questions from chapter content using Hugging Face Transformers. Each question is linked to the exact source passage and page number.
- **Interactive Practice** — Answer questions one by one with immediate feedback. The source citation is shown alongside each answer.
- **Mistake Review** — Incorrect answers are tracked and grouped by chapter. Students can re-do failed questions until they get them right.
- **Progress Tracking** — Per-chapter completion percentages, accuracy rates, and per-question history. Includes timeline charts filtered by date range.
- **Mock Exams** — Timed exams with configurable question count, chapter selection, and question type. Supports pause/resume. Results show score breakdown with citations.
- **Bookmarks & Notes** — Bookmark questions or document pages. Attach personal notes to bookmarks or citation passages.

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | React | SPA with component-based UI |
| Backend | FastAPI (Python) | Async REST API, auto-generated docs |
| Database | MySQL | 13 tables — users, documents, questions, sessions, exams, bookmarks, notes |
| AI Layer | AI-powered document parsing + question generation | Structure extraction for uploaded documents and quiz generation from curated text |

## Database Schema

13 tables organized into three groups:

- **Content**: `users`, `user_preferences`, `documents`, `topics`, `chapters`
- **Questions**: `questions`, `question_options`
- **Learning**: `study_sessions`, `user_answers`, `exams`, `exam_questions`, `bookmarks`, `notes`

Key relationships: documents → chapters → questions → question_options. Study sessions and exams record per-question answers with correctness flags.
