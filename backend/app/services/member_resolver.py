"""
Resolve speaker names from Hansard text to Member records in the database.
Handles name variations, historical members, and disambiguation by electorate.
"""
from typing import Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.models import Member
from loguru import logger

# Known WA opposition members with party mapping
KNOWN_MEMBERS = [
    # Liberal Party
    {"full_name": "David Honey", "first_name": "David", "last_name": "Honey", "party": "Liberal", "party_short": "LIB", "electorate": "Cottesloe", "chamber": "Legislative Assembly", "party_color": "#003087"},
    {"full_name": "Libby Mettam", "first_name": "Libby", "last_name": "Mettam", "party": "Liberal", "party_short": "LIB", "electorate": "Vasse", "chamber": "Legislative Assembly", "party_color": "#003087"},
    {"full_name": "Mark Hooper", "first_name": "Mark", "last_name": "Hooper", "party": "Liberal", "party_short": "LIB", "electorate": "Bunbury", "chamber": "Legislative Assembly", "party_color": "#003087"},
    {"full_name": "Peter Rundle", "first_name": "Peter", "last_name": "Rundle", "party": "National", "party_short": "NAT", "electorate": "Roe", "chamber": "Legislative Assembly", "party_color": "#006633"},
    {"full_name": "Mia Davies", "first_name": "Mia", "last_name": "Davies", "party": "National", "party_short": "NAT", "electorate": "Central Wheatbelt", "chamber": "Legislative Assembly", "party_color": "#006633"},
    {"full_name": "Martin Aldridge", "first_name": "Martin", "last_name": "Aldridge", "party": "National", "party_short": "NAT", "electorate": "Agricultural", "chamber": "Legislative Council", "party_color": "#006633"},
    {"full_name": "Neil Thomson", "first_name": "Neil", "last_name": "Thomson", "party": "National", "party_short": "NAT", "electorate": "North West Central", "chamber": "Legislative Assembly", "party_color": "#006633"},
    {"full_name": "Lara Dalton", "first_name": "Lara", "last_name": "Dalton", "party": "Liberal", "party_short": "LIB", "electorate": "Geraldton", "chamber": "Legislative Assembly", "party_color": "#003087"},
    {"full_name": "Nick Goiran", "first_name": "Nick", "last_name": "Goiran", "party": "Liberal", "party_short": "LIB", "electorate": "South Metropolitan", "chamber": "Legislative Council", "party_color": "#003087"},
    {"full_name": "Peter Collier", "first_name": "Peter", "last_name": "Collier", "party": "Liberal", "party_short": "LIB", "electorate": "North Metropolitan", "chamber": "Legislative Council", "party_color": "#003087"},
    {"full_name": "Steve Martin", "first_name": "Steve", "last_name": "Martin", "party": "National", "party_short": "NAT", "electorate": "Mining and Pastoral", "chamber": "Legislative Council", "party_color": "#006633"},
    # Greens
    {"full_name": "Brad Pettitt", "first_name": "Brad", "last_name": "Pettitt", "party": "Greens", "party_short": "GRN", "electorate": "South Metropolitan", "chamber": "Legislative Council", "party_color": "#009B3A"},
    {"full_name": "Samantha Rowe", "first_name": "Samantha", "last_name": "Rowe", "party": "Greens", "party_short": "GRN", "electorate": "South Metropolitan", "chamber": "Legislative Council", "party_color": "#009B3A"},
    # One Nation
    {"full_name": "Colin Tincknell", "first_name": "Colin", "last_name": "Tincknell", "party": "One Nation", "party_short": "ONP", "electorate": "South West", "chamber": "Legislative Council", "party_color": "#FF6600"},
    {"full_name": "Brian Ellis", "first_name": "Brian", "last_name": "Ellis", "party": "One Nation", "party_short": "ONP", "electorate": "Mining and Pastoral", "chamber": "Legislative Council", "party_color": "#FF6600"},
]


async def seed_known_members(db: AsyncSession):
    """Seed the database with known opposition members."""
    for member_data in KNOWN_MEMBERS:
        result = await db.execute(
            select(Member).where(Member.full_name == member_data["full_name"])
        )
        if not result.scalar_one_or_none():
            member = Member(
                **member_data,
                is_government=False,
                is_active=True,
                avatar_initials=(member_data["first_name"][0] + member_data["last_name"][0]).upper(),
            )
            db.add(member)
    await db.commit()
    logger.info("Seeded known members")


async def resolve_member(
    db: AsyncSession,
    speaker_name: str,
    electorate: Optional[str],
    chamber: str,
) -> Optional[Member]:
    """
    Resolve a speaker name (from Hansard) to a Member record.
    Tries exact match, then last name + electorate, then fuzzy last name.
    Creates unknown members if not found.
    """
    if not speaker_name:
        return None

    # Clean up name
    name = speaker_name.strip()
    # Remove titles
    for title in ["Mr ", "Ms ", "Mrs ", "Dr ", "Hon "]:
        if name.startswith(title):
            name = name[len(title):].strip()

    # 1. Exact full name match
    result = await db.execute(
        select(Member).where(func.lower(Member.full_name).contains(func.lower(name)))
    )
    members = result.scalars().all()
    if len(members) == 1:
        return members[0]

    # 2. Last name + electorate match
    if electorate and members:
        for m in members:
            if m.electorate and electorate.lower() in m.electorate.lower():
                return m

    # 3. Last name match in chamber
    last_name = name.split()[-1] if name.split() else name
    result = await db.execute(
        select(Member).where(
            func.lower(Member.last_name) == func.lower(last_name),
            Member.chamber == chamber
        )
    )
    member = result.scalar_one_or_none()
    if member:
        return member

    # 4. Create new unknown member record
    logger.info(f"Creating new member record for: {speaker_name} ({electorate}) in {chamber}")
    new_member = Member(
        full_name=speaker_name,
        last_name=last_name,
        electorate=electorate,
        party="Unknown",
        party_short="UNK",
        chamber=chamber,
        is_government=False,  # Conservative default; can be updated
        party_color="#888888",
        avatar_initials=last_name[:2].upper(),
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)
    return new_member
