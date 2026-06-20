"""Add content, generation_mode, is_current, profile_id to generated_documents

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-20
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE generated_documents
            ADD COLUMN IF NOT EXISTS profile_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS content          TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS generation_mode  VARCHAR(20) NOT NULL DEFAULT 'template',
            ADD COLUMN IF NOT EXISTS is_current       BOOLEAN NOT NULL DEFAULT TRUE
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_generated_documents_opportunity_id "
        "ON generated_documents(opportunity_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_generated_documents_is_current "
        "ON generated_documents(is_current)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_generated_documents_is_current")
    op.execute("DROP INDEX IF EXISTS idx_generated_documents_opportunity_id")
    op.execute("""
        ALTER TABLE generated_documents
            DROP COLUMN IF EXISTS profile_id,
            DROP COLUMN IF EXISTS content,
            DROP COLUMN IF EXISTS generation_mode,
            DROP COLUMN IF EXISTS is_current
    """)
