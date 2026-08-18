"""Route referral requests to a specific employee (to_user_id) + status

Revision ID: 0016
Revises: 0015
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # jobref.referral_requests has no rows yet (feature just shipped), so
    # to_user_id can go straight to NOT NULL with no backfill.
    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD COLUMN to_user_id UUID NOT NULL REFERENCES jobref.users(id) ON DELETE CASCADE;
    """)
    op.execute("""
        CREATE INDEX idx_jobref_referral_requests_to_user
        ON jobref.referral_requests(to_user_id);
    """)
    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pending_review';
    """)
    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD CONSTRAINT jobref_referral_requests_status_chk
        CHECK (status IN ('pending_review'));
    """)
    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD COLUMN reviewed_at TIMESTAMPTZ;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE jobref.referral_requests DROP COLUMN IF EXISTS reviewed_at;")
    op.execute("""
        ALTER TABLE jobref.referral_requests
        DROP CONSTRAINT IF EXISTS jobref_referral_requests_status_chk;
    """)
    op.execute("ALTER TABLE jobref.referral_requests DROP COLUMN IF EXISTS status;")
    op.execute("""
        DROP INDEX IF EXISTS jobref.idx_jobref_referral_requests_to_user;
    """)
    op.execute("ALTER TABLE jobref.referral_requests DROP COLUMN IF EXISTS to_user_id;")
