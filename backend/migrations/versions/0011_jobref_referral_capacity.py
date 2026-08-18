"""Replace can_refer/refer_count with a direct, always-asked referral_capacity

Revision ID: 0011
Revises: 0010
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old conditional CHECK constraint before touching the columns
    # it references.
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        DROP CONSTRAINT IF EXISTS jobref_employee_refer_fields_chk;
    """)

    # referral_capacity replaces refer_count (raw integer) with the same
    # bucketed scale as daily_referral_view_cap, per the user's request to
    # reuse the same options for both questions.
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        ADD COLUMN IF NOT EXISTS referral_capacity VARCHAR(10);
    """)
    # Backfill: only disposable test rows exist at this point, same
    # reasoning as migration 0010's backfill.
    op.execute("""
        UPDATE jobref_employee_profiles
        SET referral_capacity = 'up_to_5'
        WHERE referral_capacity IS NULL;
    """)
    op.execute("""
        UPDATE jobref_employee_profiles
        SET refer_frequency = 'monthly'
        WHERE refer_frequency IS NULL;
    """)
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        ALTER COLUMN refer_frequency SET NOT NULL;
    """)
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        ALTER COLUMN referral_capacity SET NOT NULL;
    """)
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        ADD CONSTRAINT jobref_referral_capacity_chk
        CHECK (referral_capacity IN ('up_to_5', '5_to_10', '10_to_20', 'no_cap'));
    """)

    op.execute("ALTER TABLE jobref_employee_profiles DROP COLUMN IF EXISTS can_refer;")
    op.execute("ALTER TABLE jobref_employee_profiles DROP COLUMN IF EXISTS refer_count;")


def downgrade() -> None:
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        ADD COLUMN IF NOT EXISTS can_refer BOOLEAN NOT NULL DEFAULT TRUE;
    """)
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        ADD COLUMN IF NOT EXISTS refer_count INTEGER;
    """)
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        ALTER COLUMN refer_frequency DROP NOT NULL;
    """)
    op.execute("""
        ALTER TABLE jobref_employee_profiles
        DROP CONSTRAINT IF EXISTS jobref_referral_capacity_chk;
    """)
    op.execute("ALTER TABLE jobref_employee_profiles DROP COLUMN IF EXISTS referral_capacity;")
