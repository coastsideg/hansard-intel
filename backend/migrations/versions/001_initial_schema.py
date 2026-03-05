"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector.sqlalchemy

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")

    # Members
    op.create_table(
        'members',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('full_name', sa.String(200), nullable=False),
        sa.Column('first_name', sa.String(100)),
        sa.Column('last_name', sa.String(100)),
        sa.Column('electorate', sa.String(200)),
        sa.Column('party', sa.String(100), nullable=False),
        sa.Column('party_short', sa.String(20)),
        sa.Column('chamber', sa.String(50)),
        sa.Column('role', sa.String(200)),
        sa.Column('is_government', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('first_contribution_date', sa.Date()),
        sa.Column('last_contribution_date', sa.Date()),
        sa.Column('total_contributions', sa.Integer(), default=0),
        sa.Column('avatar_initials', sa.String(5)),
        sa.Column('party_color', sa.String(7)),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id'),
    )

    # Hansard sources
    op.create_table(
        'hansard_sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=False, unique=True),
        sa.Column('parliament_date', sa.Date(), nullable=False),
        sa.Column('chamber', sa.String(50), nullable=False),
        sa.Column('sitting_number', sa.Integer()),
        sa.Column('raw_file_path', sa.Text()),
        sa.Column('ingested_at', sa.DateTime(timezone=True)),
        sa.Column('processing_status', sa.String(50), default='pending'),
        sa.Column('error_message', sa.Text()),
        sa.Column('contribution_count', sa.Integer(), default=0),
        sa.PrimaryKeyConstraint('id'),
    )

    # Contributions
    op.create_table(
        'contributions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('hansard_source_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('hansard_sources.id')),
        sa.Column('member_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('members.id'), nullable=False),
        sa.Column('parliament_date', sa.Date(), nullable=False),
        sa.Column('chamber', sa.String(50), nullable=False),
        sa.Column('contribution_type', sa.String(100)),
        sa.Column('debate_title', sa.Text()),
        sa.Column('debate_id', postgresql.UUID(as_uuid=True)),
        sa.Column('sequence_in_debate', sa.Integer()),
        sa.Column('raw_text', sa.Text(), nullable=False),
        sa.Column('word_count', sa.Integer()),
        sa.Column('ai_summary', sa.Text()),
        sa.Column('ai_key_claims', postgresql.JSONB()),
        sa.Column('ai_topics', postgresql.ARRAY(sa.String())),
        sa.Column('ai_named_entities', postgresql.JSONB()),
        sa.Column('ai_sentiment', sa.String(20)),
        sa.Column('ai_rhetorical_devices', postgresql.ARRAY(sa.String())),
        sa.Column('ai_notable_quotes', postgresql.ARRAY(sa.Text())),
        sa.Column('ai_attack_target', sa.String(200)),
        sa.Column('ai_policy_position', sa.Text()),
        sa.Column('ai_processed_at', sa.DateTime(timezone=True)),
        sa.Column('ai_significance', sa.String(20)),
        sa.Column('has_potential_contradiction', sa.Boolean(), default=False),
        sa.Column('contradiction_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True))),
        sa.Column('contradiction_reviewed', sa.Boolean(), default=False),
        sa.Column('contradiction_confirmed', sa.Boolean(), default=False),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(1536)),
        sa.Column('search_vector', postgresql.TSVECTOR()),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id'),
    )

    # Indexes
    op.create_index('idx_contributions_member_date', 'contributions', ['member_id', 'parliament_date'])
    op.create_index('idx_contributions_date', 'contributions', ['parliament_date'])
    op.create_index('idx_contributions_topics', 'contributions', ['ai_topics'], postgresql_using='gin')
    op.create_index('idx_contributions_search', 'contributions', ['search_vector'], postgresql_using='gin')
    op.execute("CREATE INDEX idx_contributions_embedding ON contributions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")

    # Daily digests
    op.create_table(
        'daily_digests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('digest_date', sa.Date(), nullable=False, unique=True),
        sa.Column('summary', sa.Text()),
        sa.Column('top_themes', postgresql.ARRAY(sa.String())),
        sa.Column('attack_summary', sa.Text()),
        sa.Column('notable_contributions', postgresql.JSONB()),
        sa.Column('generated_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id'),
    )

    # Contradiction alerts
    op.create_table(
        'contradiction_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('member_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('members.id')),
        sa.Column('contribution_a_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('contributions.id')),
        sa.Column('contribution_b_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('contributions.id')),
        sa.Column('topic', sa.String(200)),
        sa.Column('description', sa.Text()),
        sa.Column('severity', sa.String(20)),
        sa.Column('reviewed', sa.Boolean(), default=False),
        sa.Column('confirmed', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('contradiction_alerts')
    op.drop_table('daily_digests')
    op.drop_table('contributions')
    op.drop_table('hansard_sources')
    op.drop_table('members')
