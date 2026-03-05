from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from loguru import logger

from app.core.config import settings
from app.db.database import init_db
from app.tasks.scheduler import start_scheduler, stop_scheduler
from app.api.routes import auth, members, contributions, chat, admin, digest


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting HANSARD INTEL")
    os.makedirs(settings.PDF_STORAGE_PATH, exist_ok=True)
    await init_db()
    if settings.ENVIRONMENT == "production":
        start_scheduler()
    yield
    stop_scheduler()
    logger.info("HANSARD INTEL shutting down")


app = FastAPI(
    title="HANSARD INTEL API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(members.router, prefix="/api/members", tags=["members"])
app.include_router(contributions.router, prefix="/api/contributions", tags=["contributions"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(digest.router, prefix="/api/digest", tags=["digest"])

# Serve React frontend (built files)
FRONTEND_BUILD = "/app/frontend/dist"
if os.path.exists(FRONTEND_BUILD):
    app.mount("/assets", StaticFiles(directory=f"{FRONTEND_BUILD}/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = f"{FRONTEND_BUILD}/index.html"
        return FileResponse(index)
else:
    @app.get("/")
    async def root():
        return {"status": "HANSARD INTEL API running", "docs": "/docs"}
