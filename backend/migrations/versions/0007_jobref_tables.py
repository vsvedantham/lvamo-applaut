"""Add jobref_users, jobref_employee_profiles, jobref_seeker_profiles tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-17
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS jobref_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            phone VARCHAR(32) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('employee', 'job_seeker')),
            domain VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS jobref_employee_profiles (
            user_id UUID PRIMARY KEY REFERENCES jobref_users(id) ON DELETE CASCADE,
            company_name VARCHAR(255) NOT NULL,
            working_since DATE NOT NULL,
            can_refer BOOLEAN NOT NULL DEFAULT FALSE,
            refer_frequency VARCHAR(10) CHECK (refer_frequency IN ('weekly', 'monthly')),
            refer_count INTEGER,
            company_careers_url VARCHAR(1024) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT jobref_employee_refer_fields_chk CHECK (
                (can_refer = FALSE AND refer_frequency IS NULL AND refer_count IS NULL)
                OR (can_refer = TRUE AND refer_frequency IS NOT NULL AND refer_count IS NOT NULL)
            )
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS jobref_seeker_profiles (
            user_id UUID PRIMARY KEY REFERENCES jobref_users(id) ON DELETE CASCADE,
            current_job_status VARCHAR(20) NOT NULL CHECK (
                current_job_status IN ('none', 'part_time', 'mini_job', 'serving_notice')
            ),
            notice_join_date DATE,
            cv_drive_link VARCHAR(1024) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT jobref_seeker_notice_date_chk CHECK (
                (current_job_status = 'serving_notice' AND notice_join_date IS NOT NULL)
                OR (current_job_status != 'serving_notice' AND notice_join_date IS NULL)
            )
        );
    """)

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS jobref_seeker_profiles;")
    op.execute("DROP TABLE IF EXISTS jobref_employee_profiles;")
    op.execute("DROP TABLE IF EXISTS jobref_users;")
