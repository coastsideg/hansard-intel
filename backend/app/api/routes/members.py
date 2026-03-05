from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.database import get_db
from app.db.models import Member, Contribution
from app.api.routes.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()

class MemberOut(BaseModel):
    id: str
    full_name: str
    party: str
    party_short: Optional[str]
    party_color: Optional[str]
    electorate: Optional[str]
    chamber: Optional[str]
    role: Optional[str]
    total_contributions: int
    avatar_initials: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=list[MemberOut])
async def list_members(
    party: Optional[str] = None,
    chamber: Optional[str] = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    q = select(Member).where(Member.is_government == False)
    if party:
        q = q.where(Member.party == party)
    if chamber:
        q = q.where(Member.chamber == chamber)
    if is_active:
        q = q.where(Member.is_active == True)
    q = q.order_by(desc(Member.total_contributions))
    result = await db.execute(q)
    members = result.scalars().all()
    return [MemberOut(
        id=str(m.id), full_name=m.full_name, party=m.party, party_short=m.party_short,
        party_color=m.party_color, electorate=m.electorate, chamber=m.chamber,
        role=m.role, total_contributions=m.total_contributions or 0,
        avatar_initials=m.avatar_initials, is_active=m.is_active
    ) for m in members]

@router.get("/{member_id}/stats")
async def member_stats(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(
        select(
            func.count(Contribution.id).label("total"),
            func.count(Contribution.ai_sentiment).label("analysed"),
        ).where(Contribution.member_id == uuid.UUID(member_id))
    )
    row = result.one()
    
    # Topic breakdown
    topic_result = await db.execute(
        select(Contribution.ai_topics, func.count().label("cnt"))
        .where(Contribution.member_id == uuid.UUID(member_id))
        .where(Contribution.ai_topics.isnot(None))
        .group_by(Contribution.ai_topics)
        .limit(20)
    )
    
    return {"total": row.total, "analysed": row.analysed}
