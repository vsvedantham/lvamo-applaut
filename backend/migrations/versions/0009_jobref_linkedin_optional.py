"""Make jobref_users.linkedin_id nullable (employees register directly, no LinkedIn)

Revision ID: 0009
Revises: 0008
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # LinkedIn OAuth is now job-seeker-only (product decision) — employees
    # register directly with email/password. The UNIQUE constraint on
    # linkedin_id still holds (Postgres allows multiple NULLs under UNIQUE),
    # so seeker dedup-by-LinkedIn-id is unaffected.
    op.execute("ALTER TABLE jobref_users ALTER COLUMN linkedin_id DROP NOT NULL;")


def downgrade() -> None:
    op.execute("ALTER TABLE jobref_users ALTER COLUMN linkedin_id SET NOT NULL;")
