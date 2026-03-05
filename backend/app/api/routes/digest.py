from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.db.database import get_db
from app.db.models import DailyDigest, Contribution, Member
from app.api.routes.auth import get_current_user
from app.services.ai_processor import generate_daily_digest
from datetime import date, timedelta

router = APIRouter()

@router.get("/latest")
async def get_latest_digest(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(select(DailyDigest).order_by(desc(DailyDigest.digest_date)).limit(1))
    digest = result.scalar_one_or_none()
    if not digest:
        return {"message": "No digest available yet"}
    return {
        "date": str(digest.digest_date),
        "summary": digest.summary,
        "top_themes": digest.top_themes,
        "attack_lines": digest.attack_lines,
        "notable_contributions": digest.notable_contributions,
        "contradiction_alerts": digest.contradiction_alerts,
    }


@router.post("/generate")
async def generate_digest(
    target_date: date = None,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    if not target_date:
        target_date = date.today() - timedelta(days=1)

    # Get contributions from that date
    result = await db.execute(
        select(Contribution, Member)
        .join(Member, Contribution.member_id == Member.id)
        .where(
            Member.is_government == False,
            Contribution.parliament_date == target_date,
            Contribution.ai_summary.isnot(None),
        )
        .limit(50)
    )
    rows = result.all()

    if not rows:
        return {"message": f"No contributions found for {target_date}"}

    contributions_text = "\n\n".join([
        f"{m.full_name} ({m.party}) - {c.contribution_type}: {c.ai_summary}"
        for c, m in rows
    ])

    digest_data = await generate_daily_digest(str(target_date), contributions_text)
    if not digest_data:
        return {"message": "Digest generation failed"}

    digest = DailyDigest(
        digest_date=target_date,
        summary=digest_data.get("summary"),
        top_themes=digest_data.get("top_themes"),
        attack_lines=digest_data.get("attack_lines"),
        notable_contributions=digest_data.get("notable_contributions"),
        contradiction_alerts=digest_data.get("contradiction_alerts"),
    )
    db.add(digest)
    await db.commit()
    return digest_data
