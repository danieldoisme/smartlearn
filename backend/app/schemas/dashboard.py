from typing import List, Optional

from backend.app.schemas.base import CamelModel


class DashboardStats(CamelModel):
    document_count: int
    answered_count: int
    accuracy: int
    streak: int


class DashboardRecentDoc(CamelModel):
    id: int
    title: str
    topic_name: Optional[str] = None
    chapter_count: int
    progress: int


class DashboardActivity(CamelModel):
    type: str
    desc: str
    time: str


class DashboardSummary(CamelModel):
    greeting_name: str
    stats: DashboardStats
    recent_documents: List[DashboardRecentDoc]
    recent_activity: List[DashboardActivity]
