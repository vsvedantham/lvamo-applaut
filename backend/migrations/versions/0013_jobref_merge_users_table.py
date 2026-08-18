"""Merge jobref_users/jobref_employee_profiles/jobref_seeker_profiles into a
single jobref.users table, moved into the jobref Postgres schema

Revision ID: 0013
Revises: 0012
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # `jobref` schema already exists (created alongside `applaut` in 0012).
    op.execute("""
        CREATE TABLE jobref.users (
            id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            first_name                  VARCHAR(255) NOT NULL,
            last_name                   VARCHAR(255) NOT NULL,
            email                       VARCHAR(255) NOT NULL UNIQUE,
            phone                       VARCHAR(32) NOT NULL,
            password_hash               VARCHAR(255) NOT NULL,
            linkedin_id                 VARCHAR(64) UNIQUE,
            is_employee                 BOOLEAN NOT NULL,
            domain                      VARCHAR(255) NOT NULL,
            is_active                   BOOLEAN NOT NULL DEFAULT TRUE,

            -- Employee-only fields. NULL for job seekers.
            company_name                VARCHAR(255),
            working_since               DATE,
            daily_referral_view_cap     VARCHAR(10),
            refer_frequency             VARCHAR(10),
            referral_capacity           VARCHAR(10),
            company_careers_url         VARCHAR(1024),

            -- Job-seeker-only fields. NULL for employees.
            current_job_status          VARCHAR(20),
            notice_join_date            DATE,
            cv_drive_link               VARCHAR(1024),

            created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            CONSTRAINT jobref_users_daily_referral_view_cap_chk CHECK (
                daily_referral_view_cap IS NULL
                OR daily_referral_view_cap IN ('up_to_5', '5_to_10', '10_to_20', 'no_cap')
            ),
            CONSTRAINT jobref_users_refer_frequency_chk CHECK (
                refer_frequency IS NULL OR refer_frequency IN ('weekly', 'monthly')
            ),
            CONSTRAINT jobref_users_referral_capacity_chk CHECK (
                referral_capacity IS NULL
                OR referral_capacity IN ('up_to_5', '5_to_10', '10_to_20', 'no_cap')
            ),
            CONSTRAINT jobref_users_current_job_status_chk CHECK (
                current_job_status IS NULL
                OR current_job_status IN ('none', 'part_time', 'mini_job', 'serving_notice')
            ),
            -- Employee fields: required when is_employee, absent otherwise.
            CONSTRAINT jobref_users_employee_fields_required_chk CHECK (
                NOT is_employee OR (
                    company_name IS NOT NULL AND working_since IS NOT NULL AND
                    daily_referral_view_cap IS NOT NULL AND refer_frequency IS NOT NULL AND
                    referral_capacity IS NOT NULL AND company_careers_url IS NOT NULL
                )
            ),
            CONSTRAINT jobref_users_employee_fields_absent_chk CHECK (
                is_employee OR (
                    company_name IS NULL AND working_since IS NULL AND
                    daily_referral_view_cap IS NULL AND refer_frequency IS NULL AND
                    referral_capacity IS NULL AND company_careers_url IS NULL
                )
            ),
            -- Seeker fields: required when not is_employee, absent otherwise.
            CONSTRAINT jobref_users_seeker_fields_required_chk CHECK (
                is_employee OR (current_job_status IS NOT NULL AND cv_drive_link IS NOT NULL)
            ),
            CONSTRAINT jobref_users_seeker_fields_absent_chk CHECK (
                NOT is_employee OR (
                    current_job_status IS NULL AND notice_join_date IS NULL AND cv_drive_link IS NULL
                )
            ),
            -- notice_join_date set iff current_job_status = 'serving_notice' (seekers only).
            CONSTRAINT jobref_users_notice_date_chk CHECK (
                is_employee OR (current_job_status = 'serving_notice') = (notice_join_date IS NOT NULL)
            )
        );
    """)

    op.execute("""
        INSERT INTO jobref.users (
            id, first_name, last_name, email, phone, password_hash, linkedin_id,
            is_employee, domain, is_active,
            company_name, working_since, daily_referral_view_cap, refer_frequency,
            referral_capacity, company_careers_url,
            current_job_status, notice_join_date, cv_drive_link,
            created_at, updated_at
        )
        SELECT
            u.id, u.first_name, u.last_name, u.email, u.phone, u.password_hash, u.linkedin_id,
            (u.user_type = 'employee'), u.domain, u.is_active,
            e.company_name, e.working_since, e.daily_referral_view_cap, e.refer_frequency,
            e.referral_capacity, e.company_careers_url,
            s.current_job_status, s.notice_join_date, s.cv_drive_link,
            u.created_at, u.updated_at
        FROM public.jobref_users u
        LEFT JOIN public.jobref_employee_profiles e ON e.user_id = u.id
        LEFT JOIN public.jobref_seeker_profiles s ON s.user_id = u.id;
    """)

    op.execute("DROP TABLE public.jobref_seeker_profiles")
    op.execute("DROP TABLE public.jobref_employee_profiles")
    op.execute("DROP TABLE public.jobref_users")


def downgrade() -> None:
    op.execute("""
        CREATE TABLE public.jobref_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            phone VARCHAR(32) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            linkedin_id VARCHAR(64) UNIQUE,
            user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('employee', 'job_seeker')),
            domain VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("""
        CREATE TABLE public.jobref_employee_profiles (
            user_id UUID PRIMARY KEY REFERENCES public.jobref_users(id) ON DELETE CASCADE,
            company_name VARCHAR(255) NOT NULL,
            working_since DATE NOT NULL,
            daily_referral_view_cap VARCHAR(10) NOT NULL,
            refer_frequency VARCHAR(10) NOT NULL CHECK (refer_frequency IN ('weekly', 'monthly')),
            referral_capacity VARCHAR(10) NOT NULL,
            company_careers_url VARCHAR(1024) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT jobref_referral_view_cap_chk
                CHECK (daily_referral_view_cap IN ('up_to_5', '5_to_10', '10_to_20', 'no_cap')),
            CONSTRAINT jobref_referral_capacity_chk
                CHECK (referral_capacity IN ('up_to_5', '5_to_10', '10_to_20', 'no_cap'))
        );
    """)
    op.execute("""
        CREATE TABLE public.jobref_seeker_profiles (
            user_id UUID PRIMARY KEY REFERENCES public.jobref_users(id) ON DELETE CASCADE,
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

    op.execute("""
        INSERT INTO public.jobref_users (
            id, first_name, last_name, email, phone, password_hash, linkedin_id,
            user_type, domain, is_active, created_at, updated_at
        )
        SELECT
            id, first_name, last_name, email, phone, password_hash, linkedin_id,
            CASE WHEN is_employee THEN 'employee' ELSE 'job_seeker' END,
            domain, is_active, created_at, updated_at
        FROM jobref.users;
    """)
    op.execute("""
        INSERT INTO public.jobref_employee_profiles (
            user_id, company_name, working_since, daily_referral_view_cap,
            refer_frequency, referral_capacity, company_careers_url,
            created_at, updated_at
        )
        SELECT
            id, company_name, working_since, daily_referral_view_cap,
            refer_frequency, referral_capacity, company_careers_url,
            created_at, updated_at
        FROM jobref.users
        WHERE is_employee;
    """)
    op.execute("""
        INSERT INTO public.jobref_seeker_profiles (
            user_id, current_job_status, notice_join_date, cv_drive_link,
            created_at, updated_at
        )
        SELECT
            id, current_job_status, notice_join_date, cv_drive_link,
            created_at, updated_at
        FROM jobref.users
        WHERE NOT is_employee;
    """)

    op.execute("DROP TABLE jobref.users")
