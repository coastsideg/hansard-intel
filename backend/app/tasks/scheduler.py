"""
APScheduler: runs daily scrape at 6am AWST (UTC+8 = 22:00 UTC previous day)
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger
from app.db.database import AsyncSessionLocal
from app.services.scraper import run_daily_scrape
from app.services.ingestion import run_pending_ingestion

scheduler = AsyncIOScheduler(timezone="Australia/Perth")

async def daily_job():
    logger.info("Daily scrape job starting")
    async with AsyncSessionLocal() as db:
        await run_daily_scrape(db)
        await run_pending_ingestion(db, limit=20)
    logger.success("Daily scrape job complete")

def start_scheduler():
    # 6am Perth time = 22:00 UTC
    scheduler.add_job(daily_job, CronTrigger(hour=22, minute=0, timezone="UTC"))
    scheduler.start()
    logger.info("Scheduler started — daily job at 6am AWST")

def stop_scheduler():
    scheduler.shutdown()
