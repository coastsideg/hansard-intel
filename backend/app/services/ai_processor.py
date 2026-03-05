"""
AI Processing Pipeline
Uses Claude to extract intelligence from each contribution.
"""
import json
import asyncio
from typing import Optional
import anthropic
from loguru import logger
from app.core.config import settings

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

ANALYSIS_SYSTEM_PROMPT = """You are an expert political analyst working for the Western Australian Labor Party's Premier's Office.
Your job is to extract structured intelligence from WA Parliamentary Hansard contributions.
You must respond ONLY with valid JSON — no preamble, no explanation, no markdown.

Focus on opposition members (Liberal, National, Greens, One Nation, Independents).
Be precise, factual, and politically astute. Extract genuine insights that would be useful for:
- Opposition research
- Speech preparation  
- Contradiction detection
- Identifying attack lines and rhetorical patterns"""

ANALYSIS_PROMPT_TEMPLATE = """Analyse this WA Parliamentary contribution and return JSON with exactly these fields:

CONTRIBUTION:
Date: {date}
Chamber: {chamber}
Type: {contribution_type}
Debate: {debate_title}
Speaker: {speaker_name}
Text: {text}

Return JSON:
{{
  "summary": "2-4 sentence plain English summary of what was said and why it matters",
  "key_claims": ["specific factual claim 1", "specific factual claim 2"],
  "topics": ["topic1", "topic2", "topic3"],
  "named_entities": {{
    "people": ["name1"],
    "organisations": ["org1"],
    "policies": ["policy1"],
    "places": ["place1"]
  }},
  "sentiment": "attack|policy|procedural|grievance|supportive|mixed",
  "rhetorical_devices": ["statistics|anecdote|comparison|question|repetition|etc"],
  "notable_quotes": ["verbatim quote worth flagging"],
  "attack_target": "who or what is being attacked, or null",
  "policy_position": "stated policy position if any, or null",
  "significance": "high|normal|low",
  "potential_contradiction_hint": "brief note if this might contradict a prior known position, or null"
}}"""

EMBEDDING_PROMPT_TEMPLATE = """Parliamentary contribution by {speaker} on {date}:
Topics: {topics}
{text}"""


async def analyse_contribution(
    text: str,
    date: str,
    chamber: str,
    contribution_type: str,
    debate_title: str,
    speaker_name: str,
) -> Optional[dict]:
    """Run Claude analysis on a single contribution."""
    if len(text.strip()) < 50:
        return None

    # Truncate very long contributions
    truncated_text = text[:4000] if len(text) > 4000 else text

    prompt = ANALYSIS_PROMPT_TEMPLATE.format(
        date=date,
        chamber=chamber,
        contribution_type=contribution_type or "General",
        debate_title=debate_title or "Unknown",
        speaker_name=speaker_name,
        text=truncated_text,
    )

    try:
        message = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=1000,
            system=ANALYSIS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = message.content[0].text.strip()
        # Clean any accidental markdown fences
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error for contribution: {e}")
        return None
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        return None


async def generate_embedding(text: str, speaker: str, date: str, topics: list) -> Optional[list[float]]:
    """Generate a text embedding using Claude's embedding or a simple approach."""
    # Use Anthropic API for embeddings if available, otherwise use a hash-based approach
    # Note: Anthropic doesn't have a dedicated embedding endpoint yet
    # We'll use a text summarization approach to create a semantic representation
    # In production, consider OpenAI text-embedding-3-small for true vector embeddings
    try:
        embed_text = EMBEDDING_PROMPT_TEMPLATE.format(
            speaker=speaker,
            date=date,
            topics=", ".join(topics) if topics else "general",
            text=text[:1000],
        )
        # For now, return None — embeddings can be added when OpenAI key is available
        # TODO: Integrate OpenAI embeddings or use sentence-transformers locally
        return None
    except Exception as e:
        logger.warning(f"Embedding generation failed: {e}")
        return None


async def process_contribution_batch(contributions: list[dict]) -> list[dict]:
    """Process a batch of contributions with rate limiting."""
    results = []
    for contrib in contributions:
        analysis = await analyse_contribution(
            text=contrib["raw_text"],
            date=str(contrib["parliament_date"]),
            chamber=contrib["chamber"],
            contribution_type=contrib.get("contribution_type", ""),
            debate_title=contrib.get("debate_title", ""),
            speaker_name=contrib.get("speaker_name", "Unknown"),
        )
        results.append({"contribution": contrib, "analysis": analysis})
        # Rate limiting — be gentle with the API
        await asyncio.sleep(0.5)
    return results


async def generate_daily_digest(
    date_str: str,
    contributions_summary: str,
) -> Optional[dict]:
    """Generate a daily digest of parliamentary activity."""
    prompt = f"""Generate a political intelligence digest for WA Parliament on {date_str}.

Summary of contributions:
{contributions_summary[:6000]}

Return JSON:
{{
  "summary": "3-4 sentence executive summary of the day's parliamentary activity",
  "top_themes": ["theme1", "theme2", "theme3"],
  "attack_lines": [
    {{"member": "name", "target": "what they attacked", "summary": "brief summary"}}
  ],
  "notable_contributions": [
    {{"member": "name", "quote": "notable quote", "significance": "why it matters"}}
  ],
  "contradiction_alerts": [
    {{"member": "name", "today": "what they said today", "previous": "what they said before", "date": "prior date"}}
  ],
  "qt_prep_notes": "1-2 sentences on what to watch out for in next QT"
}}"""

    try:
        message = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=2000,
            system=ANALYSIS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = message.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Digest generation failed: {e}")
        return None


async def chat_planner(query: str, conversation_history: list[dict]) -> dict:
    """Plan a search strategy for the intelligence assistant."""
    history_text = "\n".join(
        f"{m['role'].upper()}: {m['content'][:200]}" 
        for m in conversation_history[-6:]
    )
    
    prompt = f"""You are planning a search strategy for a parliamentary intelligence system.

Query: {query}
Recent conversation:
{history_text}

Return JSON with search plan:
{{
  "searches": [
    {{"description": "what to search for", "member_filter": "member name or null", "topic_filter": "topic or null", "date_range": "e.g. last 30 days or null", "type_filter": "contribution type or null"}}
  ],
  "intent": "research|briefing|contradiction_check|speech_prep|general",
  "time_sensitivity": "current|historical|both"
}}"""

    try:
        message = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(message.content[0].text.strip())
    except Exception:
        return {"searches": [{"description": query, "member_filter": None, "topic_filter": None, "date_range": None}], "intent": "general"}


async def chat_responder(
    query: str,
    evidence: list[dict],
    conversation_history: list[dict],
) -> dict:
    """Generate an intelligence response based on retrieved evidence."""
    evidence_text = "\n\n".join([
        f"[{i+1}] {e.get('member_name', 'Unknown')} | {e.get('parliament_date')} | {e.get('contribution_type', '')}\n{e.get('ai_summary') or e.get('raw_text', '')[:300]}"
        for i, e in enumerate(evidence[:20])
    ])

    history = [{"role": m["role"], "content": m["content"]} for m in conversation_history[-8:]]
    history.append({"role": "user", "content": f"""Query: {query}

Evidence from Hansard:
{evidence_text}

Provide a structured analytical response. Use markdown for formatting.
Be precise, cite source numbers [1], [2] etc, and be genuinely useful for political strategy.
End with 3 follow-up questions the user might want to ask.

Return JSON:
{{
  "response": "full markdown response",
  "confidence": "high|medium|low|speculative",
  "follow_ups": ["question 1", "question 2", "question 3"],
  "source_indices": [1, 2, 3]
}}"""})

    try:
        message = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=2000,
            system="You are HANSARD INTEL, a political intelligence assistant for the WA Labor Party Premier's Office. Be analytical, precise, and politically astute. Always cite specific Hansard sources.",
            messages=history,
        )
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except json.JSONDecodeError:
        # Return the raw text if JSON parsing fails
        return {
            "response": message.content[0].text if 'message' in dir() else "Analysis unavailable.",
            "confidence": "medium",
            "follow_ups": [],
            "source_indices": list(range(1, min(4, len(evidence) + 1))),
        }
    except Exception as e:
        logger.error(f"Chat response failed: {e}")
        return {"response": "I encountered an error processing your query.", "confidence": "low", "follow_ups": [], "source_indices": []}
