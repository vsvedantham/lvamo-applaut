"""Add jobref.referral_requests

Revision ID: 0015
Revises: 0014
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE jobref.referral_requests (
            id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            seeker_user_id            UUID NOT NULL REFERENCES jobref.users(id) ON DELETE CASCADE,
            company_name              VARCHAR(255) NOT NULL,
            company_careers_url       VARCHAR(1024) NOT NULL,
            first_name                VARCHAR(255) NOT NULL,
            last_name                 VARCHAR(255) NOT NULL,
            job_link                  VARCHAR(1024) NOT NULL,
            cv_drive_link             VARCHAR(1024) NOT NULL,
            cover_letter_drive_link   VARCHAR(1024) NOT NULL,
            message                   VARCHAR(150) NOT NULL,
            created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("""
        CREATE INDEX idx_jobref_referral_requests_seeker
        ON jobref.referral_requests(seeker_user_id);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE jobref.referral_requests")
