"""
Admin routes: trigger scrapes, ingestion, check status
File: app/api/routes/admin.py

Replaces the previous admin.py with full status data matching
what Admin.tsx expects:
  - total_records
  - records_by_year
  - is_scraping
  - last_harvest
"""

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.db.models import HansardSource, Contribution, Member
from app.api.routes.auth import get_current_user
from app.services.scraper import run_historical_scrape, run_daily_scrape
from app.services.ingestion import run_pending_ingestion
from app.services.member_resolver import seed_known_members

router = APIRouter()

# ---------------------------------------------------------------------------
# Shared scrape-in-progress flag
# This is an in-memory flag. It resets if the server restarts, which is fine
# for Railway — it tells the frontend whether a scrape is currently running.
# ---------------------------------------------------------------------------
_is_scraping: bool = False


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class HistoricalScrapeRequest(BaseModel):
    from_year: int = 2017


# ---------------------------------------------------------------------------
# POST /api/admin/scrape/historical
#
# Triggered by Admin.tsx when the user clicks "Start Automated Scrape".
# Runs in the background so the HTTP response returns immediately.
# ---------------------------------------------------------------------------
@router.post("/scrape/historical")
async def trigger_historical_scrape(
    body: HistoricalScrapeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    global _is_scraping

    if _is_scraping:
        return {
            "status": "already_running",
            "message": "A scrape is already in progress. Check /api/admin/status for updates.",
        }

    async def _run():
        global _is_scraping
        _is_scraping = True
        try:
            await run_historical_scrape(db, body.from_year)
            await run_pending_ingestion(db, limit=9999)
        finally:
            _is_scraping = False

    background_tasks.add_task(_run)

    return {
        "status": "started",
        "message": f"Historical scrape from {body.from_year} to present started in background. "
                   "Poll /api/admin/status every 10 seconds to track progress.",
    }


# ---------------------------------------------------------------------------
# POST /api/admin/scrape/daily
# ---------------------------------------------------------------------------
@router.post("/scrape/daily")
async def trigger_daily_scrape(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    global _is_scraping

    if _is_scraping:
        return {"status": "already_running", "message": "A scrape is already in progress."}

    async def _run():
        global _is_scraping
        _is_scraping = True
        try:
            await run_daily_scrape(db)
            await run_pending_ingestion(db, limit=20)
        finally:
            _is_scraping = False

    background_tasks.add_task(_run)
    return {"status": "started", "message": "Daily scrape started in background."}


# ---------------------------------------------------------------------------
# POST /api/admin/ingest/pending
# ---------------------------------------------------------------------------
@router.post("/ingest/pending")
async def trigger_ingestion(
    limit: int = 10,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    background_tasks.add_task(run_pending_ingestion, db, limit)
    return {"status": "started", "message": f"Processing up to {limit} pending sources."}


# ---------------------------------------------------------------------------
# POST /api/admin/seed-members
# ---------------------------------------------------------------------------
@router.post("/seed-members")
async def seed_members(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    await seed_known_members(db)
    return {"status": "ok", "message": "Known members seeded successfully."}


# ---------------------------------------------------------------------------
# GET /api/admin/status
#
# This is the endpoint Admin.tsx polls every 10 seconds via:
#   api.get('/admin/status')
#
# It must return:
#   {
#     total_records: number,
#     records_by_year: { "2021": 412, "2022": 380, ... },
#     is_scraping: boolean,
#     last_harvest: string,   ← ISO datetime string of most recent ingestion
#
#     # bonus fields used by the detailed stats panel:
#     sources: { total, pending, complete, errors },
#     contributions: { total, ai_processed }
#   }
# ---------------------------------------------------------------------------
@router.get("/status")
async def system_status(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    # --- Source pipeline counts ---
    total_sources_result = await db.execute(select(func.count(HansardSource.id)))
    pending_result = await db.execute(
        select(func.count(HansardSource.id)).where(
            HansardSource.processing_status == "pending"
        )
    )
    complete_result = await db.execute(
        select(func.count(HansardSource.id)).where(
            HansardSource.processing_status == "complete"
        )
    )
    errors_result = await db.execute(
        select(func.count(HansardSource.id)).where(
            HansardSource.processing_status == "error"
        )
    )

    # --- Contribution counts ---
    total_contrib_result = await db.execute(select(func.count(Contribution.id)))
    ai_done_result = await db.execute(
        select(func.count(Contribution.id)).where(
            Contribution.ai_processed_at.isnot(None)
        )
    )

    # --- Records broken down by year ---
    # Groups contributions by the year of parliament_date and counts them.
    # This populates the "Data Coverage by Year" bar chart in Admin.tsx.
    year_breakdown_result = await db.execute(
        select(
            extract("year", Contribution.parliament_date).label("year"),
            func.count(Contribution.id).label("count"),
        )
        .group_by(extract("year", Contribution.parliament_date))
        .order_by(extract("year", Contribution.parliament_date))
    )
    records_by_year: dict[str, int] = {
        str(int(row.year)): row.count
        for row in year_breakdown_result.all()
        if row.year is not None
    }

    # --- Last harvest timestamp ---
    # Finds the most recently ingested HansardSource that completed successfully.
    last_harvest_result = await db.execute(
        select(HansardSource.ingested_at)
        .where(HansardSource.processing_status == "complete")
        .order_by(HansardSource.ingested_at.desc())
        .limit(1)
    )
    last_harvest_row = last_harvest_result.scalar_one_or_none()
    last_harvest: str = (
        last_harvest_row.strftime("%d %b %Y %H:%M")
        if last_harvest_row
        else "Never"
    )

    total_contributions = total_contrib_result.scalar() or 0

    return {
        # Fields consumed directly by Admin.tsx
        "total_records": total_contributions,
        "records_by_year": records_by_year,
        "is_scraping": _is_scraping,
        "last_harvest": last_harvest,

        # Detailed pipeline breakdown (shown in Database Integrity panel)
        "sources": {
            "total": total_sources_result.scalar() or 0,
            "pending": pending_result.scalar() or 0,
            "complete": complete_result.scalar() or 0,
            "errors": errors_result.scalar() or 0,
        },
        "contributions": {
            "total": total_contributions,
            "ai_processed": ai_done_result.scalar() or 0,
        },
    }
