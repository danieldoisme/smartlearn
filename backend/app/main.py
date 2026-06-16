from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
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


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME}", "status": "running"}


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
