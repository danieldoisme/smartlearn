from enum import Enum

class QuestionType(str, Enum):
    MCQ = "mcq"
    MULTI = "multi"
    FILL = "fill"

class DisplayMode(str, Enum):
    IMMEDIATE = "immediate"
    END = "end"

class FileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"

class SessionType(str, Enum):
    LEARN = "learn"
    REVIEW = "review"
