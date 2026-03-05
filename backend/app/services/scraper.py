"""
WA Parliament Hansard Scraper
Discovers sitting dates and downloads daily PDFs for both chambers.
"""
import asyncio
import os
import re
from datetime import date, timedelta
from pathlib import Path
from typing import Optional
import httpx
from bs4 import BeautifulSoup
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings

CHAMBERS = {
    "la": "Legislative Assembly",
    "lh": "Legislative Council",
}

BASE_URL = "https://www.parliament.wa.gov.au"
CALENDAR_URL = f"{BASE_URL}/hansard/hansard.nsf/NewHansardCalendar"
PDF_URL_TEMPLATE = f"{BASE_URL}/hansard/daily/{{chamber}}/{{date}}/pdf/download"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; HansardIntel/1.0; WA Labor Research)"
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
async def download_pdf(client: httpx.AsyncClient, url: str, dest_path: Path) -> bool:
    """Download a PDF from the given URL to dest_path. Returns True on success."""
    try:
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        async with client.stream("GET", url, headers=HEADERS, timeout=60, follow_redirects=True) as r:
            if r.status_code == 404:
                return False
            r.raise_for_status()
            content_type = r.headers.get("content-type", "")
            if "pdf" not in content_type.lower() and "octet-stream" not in content_type.lower():
                # Check if it's actually a PDF by first chunk
                pass
            with open(dest_path, "wb") as f:
                async for chunk in r.aiter_bytes(chunk_size=8192):
                    f.write(chunk)
        # Verify it's a PDF
        with open(dest_path, "rb") as f:
            header = f.read(4)
        if header != b"%PDF":
            dest_path.unlink(missing_ok=True)
            return False
        return True
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return False
        raise
    except Exception as e:
        logger.warning(f"Download failed for {url}: {e}")
        raise


async def discover_sitting_dates_from_calendar(
    client: httpx.AsyncClient,
    from_year: int = 2017,
    to_year: Optional[int] = None,
) -> list[date]:
    """
    Scrape the WA Parliament Hansard calendar to get actual sitting dates.
    Falls back to generating candidate dates if calendar is unavailable.
    """
    if to_year is None:
        to_year = date.today().year

    sitting_dates = set()

    # Try to scrape calendar pages year by year
    for year in range(from_year, to_year + 1):
        try:
            url = f"{CALENDAR_URL}?year={year}"
            r = await client.get(url, headers=HEADERS, timeout=30, follow_redirects=True)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "lxml")
                # Look for date links in the calendar
                date_pattern = re.compile(r'\d{4}-\d{2}-\d{2}')
                for link in soup.find_all("a", href=True):
                    href = link.get("href", "")
                    match = date_pattern.search(href)
                    if match:
                        try:
                            d = date.fromisoformat(match.group())
                            if d.year == year:
                                sitting_dates.add(d)
                        except ValueError:
                            pass
                # Also look in text content
                for text in soup.stripped_strings:
                    match = date_pattern.search(text)
                    if match:
                        try:
                            d = date.fromisoformat(match.group())
                            if d.year == year:
                                sitting_dates.add(d)
                        except ValueError:
                            pass
                logger.info(f"Calendar scrape year {year}: found {len(sitting_dates)} dates so far")
            await asyncio.sleep(settings.SCRAPE_DELAY_SECONDS)
        except Exception as e:
            logger.warning(f"Calendar scrape failed for {year}: {e}")

    if len(sitting_dates) > 50:
        return sorted(sitting_dates)

    # Fallback: generate all weekdays (Tue-Thu primarily) and verify via HEAD requests
    logger.info("Calendar scrape insufficient, generating candidate dates for verification")
    return await generate_candidate_dates(from_year, to_year)


async def generate_candidate_dates(from_year: int, to_year: int) -> list[date]:
    """Generate all possible sitting dates (Tue-Thu) for verification."""
    candidates = []
    current = date(from_year, 1, 1)
    end = date(to_year, 12, 31)
    while current <= end:
        # Parliament typically sits Tue-Thu
        if current.weekday() in (1, 2, 3):  # Tue=1, Wed=2, Thu=3
            candidates.append(current)
        current += timedelta(days=1)
    logger.info(f"Generated {len(candidates)} candidate dates ({from_year}-{to_year})")
    return candidates


async def check_pdf_exists(client: httpx.AsyncClient, chamber_code: str, sitting_date: date) -> bool:
    """Quick HEAD check to see if a PDF exists for this date/chamber."""
    url = PDF_URL_TEMPLATE.format(chamber=chamber_code, date=sitting_date.isoformat())
    try:
        r = await client.head(url, headers=HEADERS, timeout=15, follow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False


async def scrape_and_store_pdf(
    client: httpx.AsyncClient,
    chamber_code: str,
    sitting_date: date,
    db_session,
) -> Optional[dict]:
    """
    Download a Hansard PDF for the given chamber/date and record it in the DB.
    Returns the hansard_source record dict or None if not found.
    """
    from sqlalchemy import select
    from app.db.models import HansardSource

    url = PDF_URL_TEMPLATE.format(chamber=chamber_code, date=sitting_date.isoformat())
    chamber_name = CHAMBERS[chamber_code]

    # Check if already ingested
    result = await db_session.execute(
        select(HansardSource).where(HansardSource.source_url == url)
    )
    existing = result.scalar_one_or_none()
    if existing:
        logger.debug(f"Already ingested: {url}")
        return None

    # Build storage path
    pdf_path = Path(settings.PDF_STORAGE_PATH) / chamber_code / str(sitting_date.year) / f"{sitting_date.isoformat()}.pdf"

    logger.info(f"Downloading: {url}")
    success = await download_pdf(client, url, pdf_path)

    if not success:
        logger.debug(f"No PDF at {url}")
        return None

    # Record in DB
    source = HansardSource(
        source_url=url,
        parliament_date=sitting_date,
        chamber=chamber_name,
        raw_file_path=str(pdf_path),
        processing_status="pending",
    )
    db_session.add(source)
    await db_session.commit()
    await db_session.refresh(source)
    logger.success(f"Stored: {sitting_date} {chamber_name} -> {pdf_path}")
    return {"id": str(source.id), "date": sitting_date.isoformat(), "chamber": chamber_name}


async def run_historical_scrape(db_session, from_year: int = 2017):
    """Run the full historical scrape. Called once on initial setup."""
    async with httpx.AsyncClient() as client:
        sitting_dates = await discover_sitting_dates_from_calendar(client, from_year)
        logger.info(f"Found {len(sitting_dates)} candidate dates to check")

        results = {"downloaded": 0, "skipped": 0, "errors": 0}
        semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_DOWNLOADS)

        async def process_date(d: date):
            async with semaphore:
                for chamber_code in CHAMBERS:
                    try:
                        result = await scrape_and_store_pdf(client, chamber_code, d, db_session)
                        if result:
                            results["downloaded"] += 1
                        else:
                            results["skipped"] += 1
                        await asyncio.sleep(settings.SCRAPE_DELAY_SECONDS)
                    except Exception as e:
                        logger.error(f"Error {d} {chamber_code}: {e}")
                        results["errors"] += 1

        tasks = [process_date(d) for d in sitting_dates]
        await asyncio.gather(*tasks)
        logger.success(f"Historical scrape complete: {results}")
        return results


async def run_daily_scrape(db_session):
    """Check last 7 days for new PDFs. Run nightly."""
    today = date.today()
    async with httpx.AsyncClient() as client:
        results = {"downloaded": 0, "skipped": 0}
        for days_ago in range(7):
            check_date = today - timedelta(days=days_ago)
            if check_date.weekday() not in (0, 1, 2, 3, 4):  # Skip weekends
                continue
            for chamber_code in CHAMBERS:
                try:
                    result = await scrape_and_store_pdf(client, chamber_code, check_date, db_session)
                    if result:
                        results["downloaded"] += 1
                    else:
                        results["skipped"] += 1
                    await asyncio.sleep(1.0)
                except Exception as e:
                    logger.error(f"Daily scrape error {check_date} {chamber_code}: {e}")
    logger.info(f"Daily scrape: {results}")
    return results
