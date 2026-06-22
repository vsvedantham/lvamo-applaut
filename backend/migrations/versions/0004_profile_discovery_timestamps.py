"""Add last_discovery_at and last_scored_at to profiles

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-22
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS last_discovery_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS last_scored_at    TIMESTAMPTZ;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE profiles
            DROP COLUMN IF EXISTS last_discovery_at,
            DROP COLUMN IF EXISTS last_scored_at;
    """)
