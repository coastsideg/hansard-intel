"""
Full ingestion pipeline: PDF -> Parse -> Member resolve -> AI -> DB
"""
import asyncio
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from loguru import logger
from app.db.models import HansardSource, Contribution, Member
from app.services.parser import parse_hansard_pdf
from app.services.member_resolver import resolve_member
from app.services.ai_processor import analyse_contribution
import uuid


async def ingest_hansard_source(source_id: str, db: AsyncSession):
    """Process a single HansardSource: parse PDF, create contributions, run AI."""
    result = await db.execute(select(HansardSource).where(HansardSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        logger.error(f"Source not found: {source_id}")
        return

    if source.processing_status == "complete":
        logger.info(f"Already processed: {source_id}")
        return

    # Update status
    source.processing_status = "processing"
    await db.commit()

    try:
        # 1. Parse PDF
        raw_contributions = parse_hansard_pdf(
            source.raw_file_path,
            source.parliament_date,
            source.chamber,
        )

        if not raw_contributions:
            source.processing_status = "error"
            source.error_message = "No contributions extracted from PDF"
            await db.commit()
            return

        # 2. Resolve members and create contribution records
        count = 0
        for raw in raw_contributions:
            member = await resolve_member(
                db,
                raw["speaker_name"],
                raw.get("speaker_electorate"),
                raw["chamber"],
            )

            if not member:
                continue

            # Skip government members for the main intelligence feed
            # (still store them but mark appropriately)
            contrib = Contribution(
                hansard_source_id=source.id,
                member_id=member.id,
                parliament_date=raw["parliament_date"],
                chamber=raw["chamber"],
                contribution_type=raw.get("contribution_type"),
                debate_title=raw.get("debate_title"),
                debate_id=uuid.UUID(raw["debate_id"]) if raw.get("debate_id") else None,
                sequence_in_debate=raw.get("sequence_in_debate"),
                raw_text=raw["raw_text"],
                word_count=raw.get("word_count"),
            )
            db.add(contrib)
            count += 1

        await db.commit()
        logger.info(f"Created {count} contribution records for {source.id}")

        # 3. Run AI processing on non-government contributions
        result = await db.execute(
            select(Contribution, Member)
            .join(Member, Contribution.member_id == Member.id)
            .where(
                Contribution.hansard_source_id == source.id,
                Contribution.ai_processed_at.is_(None),
                Member.is_government == False,
                Contribution.word_count >= 30,
            )
        )
        rows = result.all()

        for contrib, member in rows:
            analysis = await analyse_contribution(
                text=contrib.raw_text,
                date=str(contrib.parliament_date),
                chamber=contrib.chamber,
                contribution_type=contrib.contribution_type or "",
                debate_title=contrib.debate_title or "",
                speaker_name=member.full_name,
            )

            if analysis:
                contrib.ai_summary = analysis.get("summary")
                contrib.ai_key_claims = analysis.get("key_claims")
                contrib.ai_topics = analysis.get("topics", [])
                contrib.ai_named_entities = analysis.get("named_entities")
                contrib.ai_sentiment = analysis.get("sentiment")
                contrib.ai_rhetorical_devices = analysis.get("rhetorical_devices", [])
                contrib.ai_notable_quotes = analysis.get("notable_quotes", [])
                contrib.ai_attack_target = analysis.get("attack_target")
                contrib.ai_policy_position = analysis.get("policy_position")
                contrib.ai_significance = analysis.get("significance", "normal")
                from datetime import datetime
                contrib.ai_processed_at = datetime.utcnow()

            # Rate limiting
            await asyncio.sleep(0.3)

        await db.commit()

        # Update source status
        source.processing_status = "complete"
        source.contribution_count = count
        await db.commit()

        # Update member stats
        await update_member_stats(db, source.id)
        logger.success(f"Ingestion complete for {source.id}: {count} contributions")

    except Exception as e:
        logger.error(f"Ingestion failed for {source_id}: {e}")
        source.processing_status = "error"
        source.error_message = str(e)
        await db.commit()
        raise


async def update_member_stats(db: AsyncSession, source_id: str):
    """Update member contribution counts and date ranges."""
    from sqlalchemy import func
    result = await db.execute(
        select(
            Contribution.member_id,
            func.count(Contribution.id).label("count"),
            func.min(Contribution.parliament_date).label("first"),
            func.max(Contribution.parliament_date).label("last"),
        )
        .where(Contribution.hansard_source_id == source_id)
        .group_by(Contribution.member_id)
    )
    for row in result:
        await db.execute(
            update(Member)
            .where(Member.id == row.member_id)
            .values(
                total_contributions=Member.total_contributions + row.count,
                first_contribution_date=row.first,
                last_contribution_date=row.last,
            )
        )
    await db.commit()


async def run_pending_ingestion(db: AsyncSession, limit: int = 10):
    """Process up to `limit` pending HansardSources."""
    result = await db.execute(
        select(HansardSource)
        .where(HansardSource.processing_status == "pending")
        .limit(limit)
    )
    sources = result.scalars().all()
    logger.info(f"Processing {len(sources)} pending sources")
    for source in sources:
        await ingest_hansard_source(str(source.id), db)
