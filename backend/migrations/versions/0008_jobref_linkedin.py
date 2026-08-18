"""Add linkedin_id to jobref_users (registration is now gated via LinkedIn OAuth)

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No production Jobref users exist yet (auth was never deployed), so a
    # straight NOT NULL UNIQUE add is safe — no backfill needed.
    op.execute("""
        ALTER TABLE jobref_users
        ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(64) NOT NULL UNIQUE;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE jobref_users DROP COLUMN IF EXISTS linkedin_id;")
