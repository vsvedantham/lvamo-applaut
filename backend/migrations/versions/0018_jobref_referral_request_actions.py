"""Employee actions on a referral request: under_review/accepted/rejected + evidence

Revision ID: 0018
Revises: 0017
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE jobref.referral_requests
        DROP CONSTRAINT IF EXISTS jobref_referral_requests_status_chk;
    """)
    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD CONSTRAINT jobref_referral_requests_status_chk
        CHECK (status IN ('pending_review', 'under_review', 'accepted', 'rejected'));
    """)

    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD COLUMN rejection_reason VARCHAR(150);
    """)
    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD COLUMN evidence_r2_key VARCHAR(1000);
    """)
    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD COLUMN evidence_file_name VARCHAR(500);
    """)

    # rejection_reason set iff status = 'rejected'.
    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD CONSTRAINT jobref_referral_requests_rejection_reason_chk
        CHECK ((status = 'rejected') = (rejection_reason IS NOT NULL));
    """)
    # Evidence fields: both set together, and only when accepted.
    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD CONSTRAINT jobref_referral_requests_evidence_chk
        CHECK (
            (evidence_r2_key IS NULL) = (evidence_file_name IS NULL)
            AND (evidence_r2_key IS NULL OR status = 'accepted')
        );
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE jobref.referral_requests
        DROP CONSTRAINT IF EXISTS jobref_referral_requests_evidence_chk;
    """)
    op.execute("""
        ALTER TABLE jobref.referral_requests
        DROP CONSTRAINT IF EXISTS jobref_referral_requests_rejection_reason_chk;
    """)
    op.execute("ALTER TABLE jobref.referral_requests DROP COLUMN IF EXISTS evidence_file_name;")
    op.execute("ALTER TABLE jobref.referral_requests DROP COLUMN IF EXISTS evidence_r2_key;")
    op.execute("ALTER TABLE jobref.referral_requests DROP COLUMN IF EXISTS rejection_reason;")

    op.execute("""
        ALTER TABLE jobref.referral_requests
        DROP CONSTRAINT IF EXISTS jobref_referral_requests_status_chk;
    """)
    op.execute("""
        ALTER TABLE jobref.referral_requests
        ADD CONSTRAINT jobref_referral_requests_status_chk
        CHECK (status = 'pending_review');
    """)
