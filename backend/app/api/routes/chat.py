"""
Intelligence Chat API — RAG-based conversational assistant
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, desc
from pydantic import BaseModel
from typing import Optional
import json
import uuid
from datetime import date, timedelta

from app.db.database import get_db
from app.db.models import Contribution, Member, ChatSession, ChatMessage
from app.api.routes.auth import get_current_user
from app.services.ai_processor import chat_planner, chat_responder

router = APIRouter()

RATE_LIMIT = {"per_minute": 10, "per_hour": 60}


class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    message_id: str
    response: str
    confidence: str
    follow_ups: list[str]
    sources: list[dict]
    searches_performed: list[str]


async def search_contributions(
    db: AsyncSession,
    search_plan: dict,
) -> list[dict]:
    """Execute the search plan against the contributions database."""
    all_results = []
    seen_ids = set()

    for search in search_plan.get("searches", []):
        q = (
            select(Contribution, Member)
            .join(Member, Contribution.member_id == Member.id)
            .where(Member.is_government == False)
        )

        if search.get("member_filter"):
            name = search["member_filter"]
            q = q.where(func.lower(Member.full_name).contains(func.lower(name)))

        if search.get("topic_filter"):
            topic = search["topic_filter"]
            q = q.where(
                or_(
                    func.lower(Contribution.raw_text).contains(func.lower(topic)),
                    func.lower(Contribution.ai_summary).contains(func.lower(topic)),
                    Contribution.ai_topics.any(topic),
                )
            )

        if search.get("date_range"):
            date_range = search["date_range"].lower()
            if "30 day" in date_range or "month" in date_range:
                cutoff = date.today() - timedelta(days=30)
                q = q.where(Contribution.parliament_date >= cutoff)
            elif "7 day" in date_range or "week" in date_range:
                cutoff = date.today() - timedelta(days=7)
                q = q.where(Contribution.parliament_date >= cutoff)
            elif "year" in date_range:
                cutoff = date.today() - timedelta(days=365)
                q = q.where(Contribution.parliament_date >= cutoff)

        if search.get("type_filter"):
            q = q.where(Contribution.contribution_type == search["type_filter"])

        q = q.order_by(desc(Contribution.parliament_date)).limit(15)
        result = await db.execute(q)
        rows = result.all()

        for c, m in rows:
            if str(c.id) not in seen_ids:
                seen_ids.add(str(c.id))
                all_results.append({
                    "id": str(c.id),
                    "member_name": m.full_name,
                    "member_party": m.party,
                    "parliament_date": str(c.parliament_date),
                    "contribution_type": c.contribution_type,
                    "debate_title": c.debate_title,
                    "raw_text": c.raw_text[:500],
                    "ai_summary": c.ai_summary,
                    "ai_topics": c.ai_topics,
                    "ai_notable_quotes": c.ai_notable_quotes,
                })

    return all_results[:25]


@router.post("/", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    # Get or create session
    session_id = body.session_id
    if session_id:
        result = await db.execute(select(ChatSession).where(ChatSession.id == uuid.UUID(session_id)))
        session = result.scalar_one_or_none()
        if not session:
            session_id = None

    if not session_id:
        session = ChatSession(title=body.query[:80])
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = str(session.id)

    # Get conversation history
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
        .limit(20)
    )
    history = [
        {"role": m.role, "content": m.content}
        for m in history_result.scalars().all()
    ]

    # Plan search strategy
    search_plan = await chat_planner(body.query, history)
    searches_performed = [s.get("description", "") for s in search_plan.get("searches", [])]

    # Execute searches
    evidence = await search_contributions(db, search_plan)

    # Generate response
    response_data = await chat_responder(body.query, evidence, history)

    # Build source cards
    source_indices = response_data.get("source_indices", [])
    sources = []
    for idx in source_indices:
        if 0 < idx <= len(evidence):
            e = evidence[idx - 1]
            sources.append({
                "index": idx,
                "member_name": e["member_name"],
                "parliament_date": e["parliament_date"],
                "contribution_type": e["contribution_type"],
                "snippet": (e.get("ai_notable_quotes") or [e["raw_text"][:120]])[0],
                "contribution_id": e["id"],
            })

    # Save messages
    user_msg = ChatMessage(session_id=session.id, role="user", content=body.query)
    db.add(user_msg)
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=response_data.get("response", ""),
        sources=sources,
        confidence=response_data.get("confidence"),
        follow_ups=response_data.get("follow_ups", []),
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return ChatResponse(
        session_id=session_id,
        message_id=str(assistant_msg.id),
        response=response_data.get("response", ""),
        confidence=response_data.get("confidence", "medium"),
        follow_ups=response_data.get("follow_ups", []),
        sources=sources,
        searches_performed=searches_performed,
    )


@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession).order_by(desc(ChatSession.updated_at)).limit(20)
    )
    sessions = result.scalars().all()
    return [{"id": str(s.id), "title": s.title, "updated_at": str(s.updated_at)} for s in sessions]


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == uuid.UUID(session_id))
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "sources": m.sources,
            "confidence": m.confidence,
            "follow_ups": m.follow_ups,
            "created_at": str(m.created_at),
        }
        for m in messages
    ]
