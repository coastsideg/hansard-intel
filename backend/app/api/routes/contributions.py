from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc, text
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.db.models import Contribution, Member
from app.api.routes.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid

router = APIRouter()

class ContributionOut(BaseModel):
    id: str
    member_id: str
    member_name: str
    member_party: str
    member_party_color: Optional[str]
    parliament_date: str
    chamber: str
    contribution_type: Optional[str]
    debate_title: Optional[str]
    raw_text: str
    word_count: Optional[int]
    ai_summary: Optional[str]
    ai_topics: Optional[list[str]]
    ai_sentiment: Optional[str]
    ai_notable_quotes: Optional[list[str]]
    ai_attack_target: Optional[str]
    ai_significance: Optional[str]
    has_potential_contradiction: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=list[ContributionOut])
async def list_contributions(
    member_id: Optional[str] = None,
    party: Optional[str] = None,
    chamber: Optional[str] = None,
    contribution_type: Optional[str] = None,
    sentiment: Optional[str] = None,
    topic: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    significance: Optional[str] = None,
    has_contradiction: Optional[bool] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    q = (
        select(Contribution, Member)
        .join(Member, Contribution.member_id == Member.id)
        .where(Member.is_government == False)
    )

    if member_id:
        q = q.where(Contribution.member_id == uuid.UUID(member_id))
    if party:
        q = q.where(Member.party == party)
    if chamber:
        q = q.where(Contribution.chamber == chamber)
    if contribution_type:
        q = q.where(Contribution.contribution_type == contribution_type)
    if sentiment:
        q = q.where(Contribution.ai_sentiment == sentiment)
    if topic:
        q = q.where(Contribution.ai_topics.any(topic))
    if from_date:
        q = q.where(Contribution.parliament_date >= from_date)
    if to_date:
        q = q.where(Contribution.parliament_date <= to_date)
    if significance:
        q = q.where(Contribution.ai_significance == significance)
    if has_contradiction:
        q = q.where(Contribution.has_potential_contradiction == True)
    if search:
        # Full text search
        q = q.where(
            or_(
                func.lower(Contribution.raw_text).contains(func.lower(search)),
                func.lower(Contribution.ai_summary).contains(func.lower(search)),
            )
        )

    q = q.order_by(desc(Contribution.parliament_date)).limit(limit).offset(offset)
    result = await db.execute(q)
    rows = result.all()

    return [
        ContributionOut(
            id=str(c.id),
            member_id=str(c.member_id),
            member_name=m.full_name,
            member_party=m.party,
            member_party_color=m.party_color,
            parliament_date=str(c.parliament_date),
            chamber=c.chamber,
            contribution_type=c.contribution_type,
            debate_title=c.debate_title,
            raw_text=c.raw_text,
            word_count=c.word_count,
            ai_summary=c.ai_summary,
            ai_topics=c.ai_topics,
            ai_sentiment=c.ai_sentiment,
            ai_notable_quotes=c.ai_notable_quotes,
            ai_attack_target=c.ai_attack_target,
            ai_significance=c.ai_significance,
            has_potential_contradiction=c.has_potential_contradiction or False,
        )
        for c, m in rows
    ]


@router.get("/stats/overview")
async def overview_stats(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    total = await db.execute(
        select(func.count(Contribution.id))
        .join(Member, Contribution.member_id == Member.id)
        .where(Member.is_government == False)
    )
    processed = await db.execute(
        select(func.count(Contribution.id))
        .join(Member, Contribution.member_id == Member.id)
        .where(Member.is_government == False, Contribution.ai_processed_at.isnot(None))
    )
    contradictions = await db.execute(
        select(func.count(Contribution.id))
        .where(Contribution.has_potential_contradiction == True)
    )
    members_count = await db.execute(
        select(func.count(Member.id)).where(Member.is_government == False, Member.is_active == True)
    )
    return {
        "total_contributions": total.scalar(),
        "ai_processed": processed.scalar(),
        "contradictions_flagged": contradictions.scalar(),
        "active_members": members_count.scalar(),
    }


@router.get("/recent-attacks")
async def recent_attacks(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    from datetime import timedelta
    cutoff = date.today() - timedelta(days=days)
    q = (
        select(Contribution, Member)
        .join(Member, Contribution.member_id == Member.id)
        .where(
            Member.is_government == False,
            Contribution.ai_sentiment == "attack",
            Contribution.parliament_date >= cutoff,
            Contribution.ai_significance != "low",
        )
        .order_by(desc(Contribution.parliament_date))
        .limit(20)
    )
    result = await db.execute(q)
    rows = result.all()
    return [
        {
            "id": str(c.id),
            "member": m.full_name,
            "party": m.party,
            "date": str(c.parliament_date),
            "attack_target": c.ai_attack_target,
            "summary": c.ai_summary,
            "type": c.contribution_type,
        }
        for c, m in rows
    ]
