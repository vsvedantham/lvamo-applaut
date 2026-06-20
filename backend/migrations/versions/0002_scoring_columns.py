"""Add scoring_mode, near_miss_keywords, user_decision to scores

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-20
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE scores
            ADD COLUMN IF NOT EXISTS scoring_mode    VARCHAR(20)  NOT NULL DEFAULT 'rule_based',
            ADD COLUMN IF NOT EXISTS near_miss_keywords JSONB,
            ADD COLUMN IF NOT EXISTS user_decision   VARCHAR(30)
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_scores_user_decision ON scores(user_decision)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_scores_user_decision")
    op.execute("""
        ALTER TABLE scores
            DROP COLUMN IF EXISTS scoring_mode,
            DROP COLUMN IF EXISTS near_miss_keywords,
            DROP COLUMN IF EXISTS user_decision
    """)
