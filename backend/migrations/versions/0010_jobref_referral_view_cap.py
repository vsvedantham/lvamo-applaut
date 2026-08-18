"""Add daily_referral_view_cap to jobref_employee_profiles

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        ADD COLUMN IF NOT EXISTS daily_referral_view_cap VARCHAR(10);
    """)
    # Backfill any existing rows (only ever disposable test data at this
    # point — Jobref just launched) with a neutral default before enforcing
    # NOT NULL, since every new registration now always supplies a real
    # answer via the required form field.
    op.execute("""
        UPDATE jobref_employee_profiles
        SET daily_referral_view_cap = 'no_cap'
        WHERE daily_referral_view_cap IS NULL;
    """)
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        ALTER COLUMN daily_referral_view_cap SET NOT NULL;
    """)
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        ADD CONSTRAINT jobref_referral_view_cap_chk
        CHECK (daily_referral_view_cap IN ('up_to_5', '5_to_10', '10_to_20', 'no_cap'));
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        DROP CONSTRAINT IF EXISTS jobref_referral_view_cap_chk;
    """)
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        DROP COLUMN IF EXISTS daily_referral_view_cap;
    """)
