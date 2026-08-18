"""Add jobref.companies, captured from employee registration

Revision ID: 0014
Revises: 0013
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE jobref.companies (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      UUID NOT NULL UNIQUE REFERENCES jobref.users(id) ON DELETE CASCADE,
            name         VARCHAR(255) NOT NULL,
            careers_url  VARCHAR(1024) NOT NULL,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    # Backfill from every employee already registered before this table
    # existed, so no existing company data is lost.
    op.execute("""
        INSERT INTO jobref.companies (user_id, name, careers_url)
        SELECT id, company_name, company_careers_url
        FROM jobref.users
        WHERE is_employee;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE jobref.companies")
