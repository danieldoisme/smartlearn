# SmartLearn

A web-based learning platform that uses AI to understand uploaded documents (PDF, DOCX) and generate quiz questions from the most relevant learning segments. Students upload their study materials, the system extracts chapter/section structure with AI-assisted parsing, and the question-generation module produces questions tied back to the source text.

## Features

- **Document Upload & Parsing** — Upload PDF/DOCX files. A Gemini-backed parsing pipeline extracts clean text, identifies chapters/sections semantically, preserves citation metadata, and still allows manual correction when needed. Long documents are compressed to heading candidates (and windowed if needed) to fit the model budget; deterministic "Chương N" chapter detection is preferred when present. On any AI failure it silently falls back to heuristic extraction (`used_fallback: true`).
- **Question Generation** — Generates multiple-choice, multi-select, fill-in-the-blank, and `mixed` questions from chapter content using a Gemini-backed AQG pipeline, with a local heuristic generator as fallback. Each question is linked to the exact source passage and page number.
- **Interactive Practice** — Answer questions one by one with immediate feedback. The source citation is shown alongside each answer.
- **Mistake Review** — Incorrect answers are tracked and grouped by chapter. Students can re-do failed questions until they get them right.
- **Progress Tracking** — Per-chapter completion percentages, accuracy rates, and per-question history. Includes timeline charts filtered by date range.
- **Mock Exams** — Timed exams with configurable question count, chapter selection, and question type. Supports pause/resume. Results show score breakdown with citations.
- **Bookmarks & Notes** — Bookmark questions or document pages. Attach personal notes to bookmarks or citation passages.

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | React 19 + Vite, TanStack Query, React Router, Tailwind CSS v4 + Radix UI, Recharts | SPA with component-based UI, data fetching, and charts |
| Backend | FastAPI (Python), SQLAlchemy async + aiomysql | Async REST API, auto-generated docs |
| Database | MySQL 8+ | 14 tables — users, auth tokens, documents, questions, sessions, exams, bookmarks, notes |
| AI Layer | Google Gemini (`gemini-2.5-pro`) | Document structure extraction and quiz generation, each with a heuristic fallback |

## Database Schema

14 tables organized into three groups:

- **Content**: `users`, `password_reset_tokens`, `user_preferences`, `topics`, `documents`, `chapters`
- **Questions**: `questions`, `question_options`
- **Learning**: `study_sessions`, `user_answers`, `exams`, `exam_questions`, `bookmarks`, `notes`

Key relationships: documents → chapters → questions → question_options. Study sessions and exams record per-question answers with correctness flags.
