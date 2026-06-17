# SmartLearn — Use Case Specification

**System:** SmartLearn — AI-Powered Smart Learning Platform
**Stack:** React (Frontend) · FastAPI / Python (Backend) · MySQL (Database)
**Objective:** Automate quiz generation from uploaded documents using AI/NLP; provide an end-to-end interactive learning and self-assessment experience on the web.

---

## 1. Project Overview

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite (SPA), TanStack Query, Tailwind CSS v4 + Radix UI |
| Backend | FastAPI, Python, SQLAlchemy async + aiomysql |
| Database | MySQL 8+ (14 tables, relational schema) |
| AI / NLP | Google Gemini (`gemini-2.5-pro`) — Automated Question Generation (MCQ, Multi-select, Fill-in-the-blank, mixed) |
| File Formats | PDF, DOCX |

**Core AI Pipelines**

- **Document Structure Extraction** — Gemini parses uploaded files, infers chapter/section boundaries, preserves page metadata; falls back to heuristic extraction on failure.
- **Automated Question Generation (AQG)** — Gemini generates questions from chapter text and attaches source passage and page number to each; falls back to a local heuristic generator when needed.

---

## Architectural Decisions

> These decisions represent intentional deviations from the initial specification, made to improve development velocity, deployment simplicity, or system cohesion.

| Decision | Rationale |
|---|---|
| **Email verification is Out-of-Scope** | Email confirmation (UC-01 A1 steps 5–6) is not implemented. Accounts are activated immediately on registration. This simplifies local development, testing, and deployment velocity. Re-enabling it requires adding a verification token flow to `auth.py` and `services/email.py`. |
| **Exam answers mirror to StudySession (UC-12 → UC-09)** | When an exam is submitted, the backend creates one `StudySession` record per chapter covered by the exam and writes all answers into `user_answers`. This feeds the progress tracking system (UC-09) automatically without any separate sync step. |
| **AI document parser has a silent fallback (UC-03)** | `document_processing.py` calls the AI parser first. On any failure it falls back to a heuristic text-extraction parser without surfacing an error to the user. The response includes `used_fallback: true` to indicate which path was taken. |
| **Document deletion cascades fully (UC-04)** | Deleting a document removes: chapters → questions → question options → user answers → bookmarks → notes in a single transaction. The spec only required a confirmation prompt; the cascade depth exceeds that requirement. |

---

## 2. Use Case Index

| ID | Use Case Name | Actor |
|---|---|---|
| UC-01 | Register / Login | Student |
| UC-02 | Manage Personal Profile | Student |
| UC-03 | Upload Document | Student |
| UC-04 | Manage Document Library | Student |
| UC-05 | Auto-Generate Questions from Document | Student |
| UC-06 | Select Chapter / Section to Study | Student |
| UC-07 | Interactive Question Practice | Student |
| UC-08 | View Citation Source | Student |
| UC-09 | Track Learning Progress | Student |
| UC-10 | Manage Bookmarks & Notes | Student |
| UC-11 | Review Incorrect Answers | Student |
| UC-12 | Take Comprehensive Exam | Student |

---

## 3. Detailed Use Case Specifications

---

### UC-01 — Register / Login

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User has navigated to the SmartLearn web application. |
| **Postconditions** | User is authenticated and redirected to the main Dashboard. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | User navigates to the login page. |
| 2 | System displays login form: *Email*, *Password*. |
| 3 | User enters credentials and clicks **Login**. |
| 4 | System validates credentials. |
| 5 | System redirects user to the main Dashboard. |

**Alternative Flows**

_A1 — Register New Account_

| Step | Description |
|---|---|
| 1 | At step 2, user clicks **Register**. |
| 2 | System displays registration form: *Full Name*, *Email*, *Password*, *Confirm Password*. |
| 3 | User fills in all fields and clicks **Register**. |
| 4 | System validates input (email not already registered, password strength). |
| 5 | System creates account and immediately issues a JWT token; user is redirected to Dashboard. |

> **Note:** Email verification is Out-of-Scope for this phase. See Architectural Decisions above.

_A2 — Forgot Password / Recovery_

| Step | Description |
|---|---|
| 1 | At step 2, user clicks **Forgot Password**. |
| 2 | System prompts user to enter their registered email. |
| 3 | System sends a password-reset link to that email. |
| 4 | User follows the link, enters and confirms a new password. |
| 5 | System updates the password; user returns to log in. |

**Exception Flows**

_E1 — Invalid Credentials_

| Step | Description |
|---|---|
| 1 | At step 4, system detects that email or password is incorrect. |
| 2 | System displays: *"Email or password is incorrect."* |
| 3 | User may retry or choose **Forgot Password**. |

_E2 — Email Already Registered_

| Step | Description |
|---|---|
| 1 | At step A1-4, system detects the email is already in use. |
| 2 | System displays: *"This email is already in use."* |
| 3 | User may enter a different email or switch to login. |

---

### UC-02 — Manage Personal Profile

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User is logged in. |
| **Postconditions** | Personal profile is updated successfully in the database. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | User navigates to **Personal Profile** from the menu. |
| 2 | System displays profile fields: *Full Name*, *Email*, *Avatar*, *Learning Preferences*. |
| 3 | User edits the desired fields. |
| 4 | User clicks **Save Changes**. |
| 5 | System validates data and persists updates. |
| 6 | System displays: *"Update successful."* |

**Alternative Flows**

_A1 — Change Password_

| Step | Description |
|---|---|
| 1 | User selects the **Change Password** tab. |
| 2 | System displays form: *Current Password*, *New Password*, *Confirm New Password*. |
| 3 | User fills in all fields and clicks **Update Password**. |
| 4 | System verifies current password and saves the new one. |
| 5 | System confirms password change. |

_A2 — Configure Learning Preferences_

| Step | Description |
|---|---|
| 1 | User selects the **Learning Settings** tab. |
| 2 | System displays options: *Default question count per session*, *Preferred question type*, *Answer display mode*. |
| 3 | User adjusts settings and clicks **Save**. |
| 4 | System persists settings; applied to subsequent study sessions. |

**Exception Flows**

_E1 — Current Password Incorrect_

| Step | Description |
|---|---|
| 1 | At step A1-4, system detects the current password does not match. |
| 2 | System displays: *"Current password is incorrect."* |
| 3 | User re-enters their current password. |

---

### UC-03 — Upload Document

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User is logged in. |
| **Postconditions** | Document is uploaded, AI structure extraction completes, document is ready for question generation. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | User selects **Upload Document** on the interface. |
| 2 | System displays a drag-and-drop zone or file picker (supports PDF, DOCX). |
| 3 | User selects a file from their device and clicks **Upload**. |
| 4 | System validates file format and size. |
| 5 | System uploads the file and displays a progress bar. |
| 6 | System automatically parses document structure (chapters and sections via AI). |
| 7 | System displays a preview of the document with the inferred structure. |
| 8 | User confirms and saves the document to their personal library. |

**Alternative Flows**

_A1 — Edit Structure After Parsing_

| Step | Description |
|---|---|
| 1 | At step 7, user finds the inferred structure inaccurate. |
| 2 | User edits chapter/section names or merges/splits sections. |
| 3 | User clicks **Confirm Structure**. |
| 4 | System saves the structure as modified. |

**Exception Flows**

_E1 — Unsupported File Format_

| Step | Description |
|---|---|
| 1 | At step 4, system detects the file is not PDF or DOCX. |
| 2 | System displays: *"Unsupported file format. Please upload a PDF or DOCX file."* |
| 3 | User selects a supported file. |

_E2 — File Too Large_

| Step | Description |
|---|---|
| 1 | At step 4, system detects the file exceeds the size limit. |
| 2 | System displays: *"File exceeds the allowed size (max X MB)."* |
| 3 | User selects a smaller file. |

_E3 — Structure Parsing Failure_

| Step | Description |
|---|---|
| 1 | At step 6, system cannot identify the document structure. |
| 2 | System notifies user and offers manual structure definition. |
| 3 | User names each chapter/section manually and confirms. |

---

### UC-04 — Manage Document Library

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User is logged in and has at least one document in their library. |
| **Postconditions** | Document library is updated per the user's action. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | User navigates to **Document Library** from the main menu. |
| 2 | System displays personal documents organized by topic/subject. |
| 3 | User may view details, rename, or delete a document. |
| 4 | System refreshes the list after each action. |

**Alternative Flows**

_A1 — Search Documents_

| Step | Description |
|---|---|
| 1 | User types a keyword into the search box. |
| 2 | System filters and displays matching documents by name or topic. |
| 3 | User selects a document from the results. |

_A2 — Organize by Topic_

| Step | Description |
|---|---|
| 1 | User creates a new topic folder/label. |
| 2 | User drags or assigns documents to the topic. |
| 3 | System updates document classification. |

**Exception Flows**

_E1 — Deleting a Document With Linked Questions_

| Step | Description |
|---|---|
| 1 | User selects delete on a document that already has generated questions. |
| 2 | System warns: *"This document has N linked questions. Deleting it will remove all associated questions."* |
| 3 | User confirms or cancels the deletion. |

---

### UC-05 — Auto-Generate Questions from Document

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User has uploaded at least one document with a successfully parsed structure. |
| **Postconditions** | Question set created, each question linked to its source passage and page number. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | User selects a document from the library. |
| 2 | System displays the document's chapter/section structure. |
| 3 | User selects a specific chapter or section. |
| 4 | System shows a generation form: *Question Type* (MCQ / Multi-select / Fill-in-the-blank), *Number of questions*. |
| 5 | User configures options and clicks **Generate Questions**. |
| 6 | AI/NLP module analyzes the chapter text, extracts entities and context. |
| 7 | System generates questions with answers and saves metadata (question → source passage + page number). |
| 8 | System displays a preview list of generated questions. |
| 9 | User confirms to save the question set to the question bank. |

**Alternative Flows**

_A1 — Edit Questions After Generation_

| Step | Description |
|---|---|
| 1 | At step 8, user finds a question inaccurate or wants to adjust it. |
| 2 | User selects the question and edits content or answer choices. |
| 3 | User clicks **Save Changes**. |
| 4 | System persists the edited question. |

_A2 — Generate Additional Questions for the Same Chapter_

| Step | Description |
|---|---|
| 1 | After step 9, user clicks **Generate More**. |
| 2 | User reconfigures count and type. |
| 3 | System generates additional questions, avoiding duplicates. |
| 4 | New questions are added to the question bank. |

**Exception Flows**

_E1 — Chapter Content Too Short_

| Step | Description |
|---|---|
| 1 | At step 6, AI determines the chapter text is insufficient for the requested count. |
| 2 | System displays: *"This chapter only has enough content for N questions (fewer than requested)."* |
| 3 | User accepts the available count or selects an additional chapter. |

_E2 — AI Processing Error_

| Step | Description |
|---|---|
| 1 | At step 6, the AI module encounters an error. |
| 2 | System displays an error message and prompts the user to retry. |
| 3 | If the error persists, system logs it and notifies the support team. |

---

### UC-06 — Select Chapter / Section to Study

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | A document has been uploaded and at least one chapter has generated questions. |
| **Postconditions** | User has selected a chapter and the system is ready to begin the study session. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | User selects a document from the library. |
| 2 | System displays the document's Table of Contents. |
| 3 | Each chapter/section shows: *Name*, *Number of available questions*, *Completion status (% done)*. |
| 4 | User selects a chapter or section to study. |
| 5 | System transitions to the Interactive Question Practice interface (UC-07). |

**Alternative Flows**

_A1 — Filter by Status_

| Step | Description |
|---|---|
| 1 | User applies a filter: *Not Started*, *In Progress*, *Completed*. |
| 2 | System displays chapters matching the selected status. |

**Exception Flows**

_E1 — Chapter Has No Questions_

| Step | Description |
|---|---|
| 1 | User selects a chapter that has no generated questions. |
| 2 | System displays: *"This chapter has no questions yet. Would you like to generate questions now?"* |
| 3 | If confirmed, system redirects to UC-05 (Auto-Generate Questions). |

---

### UC-07 — Interactive Question Practice

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User has selected a chapter with available questions. |
| **Postconditions** | Answers are recorded; learning progress is updated. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | System displays the first question (type: MCQ / Multi-select / Fill-in-the-blank). |
| 2 | User reads the question and selects or types an answer. |
| 3 | User clicks **Confirm** to submit. |
| 4 | System checks the answer and shows immediate feedback (Correct / Incorrect). |
| 5 | System automatically triggers UC-08 — displays the source passage related to the question. |
| 6 | User clicks **Next Question**. |
| 7 | Steps 1–6 repeat until all questions in the session are complete. |
| 8 | System displays session summary: *Correct count*, *Incorrect count*, *Accuracy rate*. |

**Alternative Flows**

_A1 — Skip Question_

| Step | Description |
|---|---|
| 1 | At step 2, user clicks **Skip**. |
| 2 | System marks the question as unanswered and advances to the next. |
| 3 | Skipped questions may be revisited later. |

_A2 — Bookmark Question_

| Step | Description |
|---|---|
| 1 | User clicks the bookmark icon during the session. |
| 2 | System saves the question to the user's personal bookmark list (UC-10). |

**Exception Flows**

_E1 — Connection Lost During Session_

| Step | Description |
|---|---|
| 1 | Network connectivity is interrupted mid-session. |
| 2 | System saves progress temporarily to local storage. |
| 3 | When connectivity is restored, system syncs data and allows the session to resume. |

---

### UC-08 — View Citation Source

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User has just answered a question (correctly or incorrectly) within UC-07. |
| **Postconditions** | User has viewed the source passage and its location in the original document. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | After feedback is shown, system automatically displays the citation source panel. |
| 2 | System shows: *Original passage* (relevant text highlighted), *Page number* containing the passage. |
| 3 | User may click the link to jump to the exact location in the original PDF. |
| 4 | User finishes reading and continues the study session. |

**Alternative Flows**

_A1 — View More Context_

| Step | Description |
|---|---|
| 1 | User clicks **Show More** to read surrounding text. |
| 2 | System expands to show additional paragraphs before and after the cited passage. |

_A2 — Add Note to Citation_

| Step | Description |
|---|---|
| 1 | User clicks **Add Note** next to the citation. |
| 2 | User types a personal note. |
| 3 | System saves the note linked to the passage and question (UC-10). |

**Exception Flows**

_E1 — Citation Source Not Found_

| Step | Description |
|---|---|
| 1 | System cannot retrieve the source passage (original file deleted or metadata corrupted). |
| 2 | System displays: *"Unable to display the citation source for this question."* |
| 3 | User continues the study session. |

---

### UC-09 — Track Learning Progress

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User is logged in and has completed at least one study session. |
| **Postconditions** | User has a clear view of their personal learning progress. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | User navigates to **Learning Progress** from the Dashboard or menu. |
| 2 | System displays overview: *% completion per chapter/document*, *Questions answered vs. total*, *Accuracy rate per chapter*. |
| 3 | User selects a specific chapter or document for detailed view. |
| 4 | System shows detailed stats: *List of answered questions*, *Result per question (correct/incorrect)*, *Time to complete*. |

**Alternative Flows**

_A1 — View Progress Chart Over Time_

| Step | Description |
|---|---|
| 1 | User selects the **Chart** tab. |
| 2 | System displays a learning progress chart by day/week. |
| 3 | User may filter by a specific date range. |

**Exception Flows**

_E1 — No Learning Data Yet_

| Step | Description |
|---|---|
| 1 | User visits progress page but has not completed any session. |
| 2 | System displays: *"You have no learning data yet. Start your first study session!"* |
| 3 | System suggests navigating to the Document Library. |

---

### UC-10 — Manage Bookmarks & Notes

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User is logged in. |
| **Postconditions** | Bookmark or note is saved / updated successfully. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | User navigates to **Bookmarks & Notes** from the menu. |
| 2 | System displays all bookmarks and notes, categorized as: *Bookmarked questions*, *Bookmarked document passages/pages*, *Personal notes*. |
| 3 | User selects an item to view details. |
| 4 | System displays the bookmark/note content with a link to the source question or document. |

**Alternative Flows**

_A1 — Add Bookmark from Document Viewer_

| Step | Description |
|---|---|
| 1 | While reading a document, user selects a passage or page and clicks **Bookmark**. |
| 2 | System saves the bookmark position. |
| 3 | User may optionally add a note to the bookmark. |

_A2 — Edit or Delete a Note_

| Step | Description |
|---|---|
| 1 | User selects a note to edit or delete. |
| 2 | User modifies the content or clicks **Delete**. |
| 3 | System updates or removes the note. |

**Exception Flows**

_E1 — Bookmark References a Deleted Document_

| Step | Description |
|---|---|
| 1 | User opens a bookmark whose source document has been deleted. |
| 2 | System displays: *"The original document has been deleted. This bookmark is no longer available."* |
| 3 | System suggests removing the broken bookmark. |

---

### UC-11 — Review Incorrect Answers

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User has completed at least one session and has at least one incorrect answer on record. |
| **Postconditions** | User has reviewed incorrect answers; new results are recorded. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | User navigates to **Review Incorrect Answers** from the menu or Dashboard. |
| 2 | System displays all incorrectly answered questions, grouped by chapter/document. |
| 3 | User clicks **Start Review** for a question group. |
| 4 | System presents each incorrect question in sequence (same interface as UC-07). |
| 5 | User re-answers each question. |
| 6 | System updates results: *Correct on retry → marked as successfully reviewed*; *Still incorrect → remains in the review list*. |
| 7 | System displays the review session summary. |

**Alternative Flows**

_A1 — Filter by Question Type_

| Step | Description |
|---|---|
| 1 | User filters by: *MCQ*, *Multi-select*, *Fill-in-the-blank*. |
| 2 | System shows only incorrect questions of the selected type. |

**Exception Flows**

_E1 — No Incorrect Answers_

| Step | Description |
|---|---|
| 1 | User accesses the review section but has answered all questions correctly. |
| 2 | System displays: *"Congratulations! You have no incorrect answers to review."* |
| 3 | System suggests taking a Comprehensive Exam (UC-12). |

---

### UC-12 — Take Comprehensive Exam

| | |
|---|---|
| **Actor** | Student |
| **Preconditions** | User has questions available from at least one chapter or document. |
| **Postconditions** | Exam is completed; comprehensive results are displayed and saved. |

**Main Flow**

| Step | Description |
|---|---|
| 1 | User selects **Comprehensive Exam** from the menu. |
| 2 | System displays exam configuration form: *Chapter(s)/document(s) to include*, *Number of questions*, *Time limit (minutes)*, *Question type (optional filter)*. |
| 3 | User configures and clicks **Start Exam**. |
| 4 | System randomly selects questions from the question bank per configuration. |
| 5 | System displays the exam interface: *Question*, *Countdown timer*, *Progress bar (answered / total)*. |
| 6 | User answers questions sequentially (no immediate answer feedback). |
| 7 | When time expires or user clicks **Submit**, system collects the exam. |
| 8 | System grades the exam and displays results: *Total score*, *Correct/incorrect count*, *Per-question detail with correct answer and citation source*. |

**Alternative Flows**

_A1 — Navigate to Previous Question_

| Step | Description |
|---|---|
| 1 | User clicks **Previous** or selects a question number from the navigation bar. |
| 2 | System shows the selected question with the previously chosen answer (if any). |
| 3 | User may change their answer. |

_A2 — Pause Exam_

| Step | Description |
|---|---|
| 1 | User clicks **Pause**. |
| 2 | System stops the countdown timer and saves the exam state. |
| 3 | User clicks **Resume** to continue. |

**Exception Flows**

_E1 — Time Expired_

| Step | Description |
|---|---|
| 1 | Countdown timer reaches zero. |
| 2 | System automatically submits with all answers provided so far. |
| 3 | Unanswered questions are counted as incorrect. |
| 4 | System displays results as in main flow step 8. |

_E2 — Insufficient Questions for Configuration_

| Step | Description |
|---|---|
| 1 | At step 4, the question bank does not have enough questions for the requested count. |
| 2 | System displays: *"Only N questions are available (fewer than requested). Do you want to continue?"* |
| 3 | User accepts or adjusts the configuration. |

---

*End of Document*
