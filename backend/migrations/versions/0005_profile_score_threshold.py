"""Add good_threshold to profiles

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-01
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS good_threshold SMALLINT NOT NULL DEFAULT 85
                CHECK (good_threshold >= 70 AND good_threshold <= 100);
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE profiles DROP COLUMN IF EXISTS good_threshold;")
