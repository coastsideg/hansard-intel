"""
Admin routes: trigger scrapes, ingestion, check status
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db
from app.db.models import HansardSource, Contribution, Member
from app.api.routes.auth import get_current_user
from app.services.scraper import run_historical_scrape, run_daily_scrape
from app.services.ingestion import run_pending_ingestion
from app.services.member_resolver import seed_known_members

router = APIRouter()


class HistoricalScrapeRequest(BaseModel):
    from_year: int = 2017


@router.post("/scrape/historical")
async def trigger_historical_scrape(
    body: HistoricalScrapeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    async def _run():
        await run_historical_scrape(db, body.from_year)
        await run_pending_ingestion(db, limit=999)

    background_tasks.add_task(_run)
    return {"status": "started", "message": f"Historical scrape from {body.from_year} started in background"}


@router.post("/scrape/daily")
async def trigger_daily_scrape(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    async def _run():
        await run_daily_scrape(db)
        await run_pending_ingestion(db, limit=20)

    background_tasks.add_task(_run)
    return {"status": "started", "message": "Daily scrape started"}


@router.post("/ingest/pending")
async def trigger_ingestion(
    limit: int = 10,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    background_tasks.add_task(run_pending_ingestion, db, limit)
    return {"status": "started", "message": f"Processing up to {limit} pending sources"}


@router.post("/seed-members")
async def seed_members(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    await seed_known_members(db)
    return {"status": "ok", "message": "Known members seeded"}


@router.get("/status")
async def system_status(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    total_sources = await db.execute(select(func.count(HansardSource.id)))
    pending = await db.execute(select(func.count(HansardSource.id)).where(HansardSource.processing_status == "pending"))
    complete = await db.execute(select(func.count(HansardSource.id)).where(HansardSource.processing_status == "complete"))
    errors = await db.execute(select(func.count(HansardSource.id)).where(HansardSource.processing_status == "error"))
    total_contrib = await db.execute(select(func.count(Contribution.id)))
    ai_done = await db.execute(select(func.count(Contribution.id)).where(Contribution.ai_processed_at.isnot(None)))

    return {
        "sources": {
            "total": total_sources.scalar(),
            "pending": pending.scalar(),
            "complete": complete.scalar(),
            "errors": errors.scalar(),
        },
        "contributions": {
            "total": total_contrib.scalar(),
            "ai_processed": ai_done.scalar(),
        }
    }
