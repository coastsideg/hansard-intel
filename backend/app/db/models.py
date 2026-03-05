import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Boolean, Integer, Date, DateTime, Text,
    ForeignKey, Float, ARRAY, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db.database import Base

class Member(Base):
    __tablename__ = "members"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(200), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    electorate = Column(String(200))
    party = Column(String(100), nullable=False)
    party_short = Column(String(20))
    chamber = Column(String(50))
    role = Column(String(200))
    is_government = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    first_contribution_date = Column(Date)
    last_contribution_date = Column(Date)
    total_contributions = Column(Integer, default=0)
    avatar_initials = Column(String(5))
    party_color = Column(String(7))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    contributions = relationship("Contribution", back_populates="member")

class HansardSource(Base):
    __tablename__ = "hansard_sources"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_url = Column(Text, nullable=False, unique=True)
    parliament_date = Column(Date, nullable=False)
    chamber = Column(String(50), nullable=False)
    sitting_number = Column(Integer)
    raw_file_path = Column(Text)
    ingested_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    processing_status = Column(String(50), default="pending")
    error_message = Column(Text)
    contribution_count = Column(Integer, default=0)
    contributions = relationship("Contribution", back_populates="hansard_source")

class Contribution(Base):
    __tablename__ = "contributions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hansard_source_id = Column(UUID(as_uuid=True), ForeignKey("hansard_sources.id"))
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"))
    parliament_date = Column(Date, nullable=False, index=True)
    chamber = Column(String(50), nullable=False)
    contribution_type = Column(String(100), index=True)
    debate_title = Column(Text)
    debate_id = Column(UUID(as_uuid=True))
    sequence_in_debate = Column(Integer)
    raw_text = Column(Text, nullable=False)
    word_count = Column(Integer)
    ai_summary = Column(Text)
    ai_key_claims = Column(JSONB)
    ai_topics = Column(ARRAY(Text))
    ai_named_entities = Column(JSONB)
    ai_sentiment = Column(String(20))
    ai_rhetorical_devices = Column(ARRAY(Text))
    ai_notable_quotes = Column(ARRAY(Text))
    ai_attack_target = Column(String(200))
    ai_policy_position = Column(Text)
    ai_significance = Column(String(20), default="normal")
    ai_processed_at = Column(DateTime(timezone=True))
    has_potential_contradiction = Column(Boolean, default=False)
    contradiction_ids = Column(ARRAY(UUID(as_uuid=True)))
    contradiction_reviewed = Column(Boolean, default=False)
    contradiction_confirmed = Column(Boolean, default=False)
    embedding = Column(Vector(1536))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    member = relationship("Member", back_populates="contributions")
    hansard_source = relationship("HansardSource", back_populates="contributions")

class DailyDigest(Base):
    __tablename__ = "daily_digests"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    digest_date = Column(Date, nullable=False, unique=True)
    summary = Column(Text)
    top_themes = Column(JSONB)
    attack_lines = Column(JSONB)
    notable_contributions = Column(JSONB)
    contradiction_alerts = Column(JSONB)
    generated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.created_at")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"))
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    sources = Column(JSONB)
    confidence = Column(String(20))
    follow_ups = Column(ARRAY(Text))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    session = relationship("ChatSession", back_populates="messages")
