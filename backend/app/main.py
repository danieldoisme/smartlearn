from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
import httpx

from backend.app.config import settings
from backend.app.core.deps import get_current_user
from backend.app.models.user import User
from backend.app.routers import auth as auth_router
from backend.app.routers import me as me_router
from backend.app.routers import progress as progress_router
from backend.app.routers import review as review_router
from backend.app.routers import library as library_router
from backend.app.routers import dashboard as dashboard_router
from backend.app.routers import study as study_router
from backend.app.routers import exam as exam_router
from backend.app.routers import bookmark as bookmark_router

app = FastAPI(title=settings.APP_NAME)

UPLOADS_DIR = Path("backend/uploads")
(UPLOADS_DIR / "avatars").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(UPLOADS_DIR)), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "qwen"
    max_tokens: int = 16384


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME}", "status": "running"}


@app.post("/ai/chat")
async def chat(request: ChatRequest, _: User = Depends(get_current_user)):
    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": request.model,
        "messages": [{"role": m.role, "content": m.content} for m in request.messages],
        "max_tokens": request.max_tokens,
    }
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{settings.AI_SERVER_URL.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Request Error: {str(e)}")


app.include_router(auth_router.router)
app.include_router(me_router.router)
app.include_router(progress_router.router)
app.include_router(review_router.router)
app.include_router(library_router.router)
app.include_router(dashboard_router.router)
app.include_router(study_router.router)
app.include_router(exam_router.router)
app.include_router(bookmark_router.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8080, reload=True)
