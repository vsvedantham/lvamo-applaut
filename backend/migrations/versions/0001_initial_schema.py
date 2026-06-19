"""Initial schema: all 9 entities

Revision ID: 0001
Revises:
Create Date: 2026-06-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # --- Enum types ---
    op.execute("""
        CREATE TYPE remote_preference_enum AS ENUM (
            'remote', 'hybrid', 'onsite', 'any'
        )
    """)
    op.execute("""
        CREATE TYPE employment_type_enum AS ENUM (
            'full_time', 'part_time', 'contract', 'freelance', 'internship'
        )
    """)
    op.execute("""
        CREATE TYPE application_status_enum AS ENUM (
            'pending_review', 'approved', 'submitted', 'rejected',
            'withdrawn', 'interviewing', 'offered', 'closed'
        )
    """)
    op.execute("""
        CREATE TYPE document_type_enum AS ENUM (
            'tailored_resume', 'cover_letter'
        )
    """)

    # --- users ---
    op.execute("""
        CREATE TABLE users (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email           VARCHAR(255) UNIQUE NOT NULL,
            password_hash   VARCHAR(255),
            name            VARCHAR(255) NOT NULL,
            google_id       VARCHAR(255) UNIQUE,
            is_active       BOOLEAN NOT NULL DEFAULT TRUE,
            is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # --- profiles ---
    op.execute("""
        CREATE TABLE profiles (
            id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            display_name                VARCHAR(255) NOT NULL,
            total_experience_years      SMALLINT,
            target_roles                TEXT[] NOT NULL DEFAULT '{}',
            target_countries            TEXT[] NOT NULL DEFAULT '{}',
            remote_preference           remote_preference_enum NOT NULL DEFAULT 'any',
            employment_types            TEXT[] NOT NULL DEFAULT '{}',
            skills                      TEXT[] NOT NULL DEFAULT '{}',
            languages                   TEXT[] NOT NULL DEFAULT '{}',
            education                   JSONB NOT NULL DEFAULT '[]',
            certifications              JSONB NOT NULL DEFAULT '[]',
            discovery_frequency_hours   SMALLINT NOT NULL DEFAULT 24
                                            CHECK (discovery_frequency_hours IN (6, 12, 24)),
            discovery_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
            is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
            created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # --- resumes ---
    op.execute("""
        CREATE TABLE resumes (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            profile_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
            file_name           VARCHAR(500) NOT NULL,
            r2_key              VARCHAR(1000) NOT NULL,
            content_extracted   JSONB,
            is_master           BOOLEAN NOT NULL DEFAULT FALSE,
            version             SMALLINT NOT NULL DEFAULT 1,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # --- opportunities ---
    op.execute("""
        CREATE TABLE opportunities (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source              VARCHAR(100) NOT NULL,
            external_id         VARCHAR(500) NOT NULL,
            title               VARCHAR(500) NOT NULL,
            company_name        VARCHAR(500) NOT NULL,
            location_raw        VARCHAR(500),
            country_code        VARCHAR(10),
            remote_option       remote_preference_enum,
            employment_type     employment_type_enum,
            description         TEXT,
            requirements        TEXT,
            salary_min          INTEGER,
            salary_max          INTEGER,
            salary_currency     VARCHAR(10),
            application_url     VARCHAR(2000),
            posted_at           TIMESTAMPTZ,
            expires_at          TIMESTAMPTZ,
            is_active           BOOLEAN NOT NULL DEFAULT TRUE,
            raw_data            JSONB NOT NULL DEFAULT '{}',
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (source, external_id)
        )
    """)

    # --- scores ---
    op.execute("""
        CREATE TABLE scores (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            opportunity_id          UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
            profile_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            total_score             SMALLINT NOT NULL CHECK (total_score BETWEEN 0 AND 100),
            skills_score            SMALLINT CHECK (skills_score BETWEEN 0 AND 100),
            experience_score        SMALLINT CHECK (experience_score BETWEEN 0 AND 100),
            location_score          SMALLINT CHECK (location_score BETWEEN 0 AND 100),
            employment_type_score   SMALLINT CHECK (employment_type_score BETWEEN 0 AND 100),
            education_score         SMALLINT CHECK (education_score BETWEEN 0 AND 100),
            languages_score         SMALLINT CHECK (languages_score BETWEEN 0 AND 100),
            explanation             JSONB NOT NULL DEFAULT '{}',
            ai_model                VARCHAR(200),
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (opportunity_id, profile_id)
        )
    """)

    # --- applications ---
    op.execute("""
        CREATE TABLE applications (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
            profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            score_id        UUID REFERENCES scores(id) ON DELETE SET NULL,
            status          application_status_enum NOT NULL DEFAULT 'pending_review',
            notes           TEXT,
            applied_at      TIMESTAMPTZ,
            submitted_at    TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # --- generated_documents ---
    op.execute("""
        CREATE TABLE generated_documents (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            application_id      UUID REFERENCES applications(id) ON DELETE SET NULL,
            opportunity_id      UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
            source_resume_id    UUID REFERENCES resumes(id) ON DELETE SET NULL,
            document_type       document_type_enum NOT NULL,
            file_name           VARCHAR(500),
            r2_key              VARCHAR(1000),
            ai_model            VARCHAR(200),
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # --- notifications ---
    op.execute("""
        CREATE TABLE notifications (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type        VARCHAR(100) NOT NULL,
            title       VARCHAR(500) NOT NULL,
            body        TEXT,
            metadata    JSONB NOT NULL DEFAULT '{}',
            is_read     BOOLEAN NOT NULL DEFAULT FALSE,
            read_at     TIMESTAMPTZ,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # --- audit_logs ---
    op.execute("""
        CREATE TABLE audit_logs (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
            action       VARCHAR(200) NOT NULL,
            entity_type  VARCHAR(100),
            entity_id    UUID,
            before_state JSONB,
            after_state  JSONB,
            ip_address   VARCHAR(45),
            user_agent   TEXT,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # --- Indexes ---
    op.execute("CREATE INDEX idx_profiles_user_id ON profiles(user_id)")
    op.execute("CREATE INDEX idx_resumes_user_id ON resumes(user_id)")
    op.execute("CREATE INDEX idx_resumes_profile_id ON resumes(profile_id)")
    op.execute("CREATE INDEX idx_opportunities_source ON opportunities(source)")
    op.execute("CREATE INDEX idx_opportunities_country_code ON opportunities(country_code)")
    op.execute("CREATE INDEX idx_opportunities_is_active ON opportunities(is_active)")
    op.execute("CREATE INDEX idx_scores_profile_id ON scores(profile_id)")
    op.execute("CREATE INDEX idx_scores_user_id ON scores(user_id)")
    op.execute("CREATE INDEX idx_scores_total_score ON scores(total_score)")
    op.execute("CREATE INDEX idx_applications_user_id ON applications(user_id)")
    op.execute("CREATE INDEX idx_applications_status ON applications(status)")
    op.execute("CREATE INDEX idx_generated_documents_user_id ON generated_documents(user_id)")
    op.execute("CREATE INDEX idx_generated_documents_application_id ON generated_documents(application_id)")
    op.execute("CREATE INDEX idx_notifications_user_id ON notifications(user_id)")
    op.execute("CREATE INDEX idx_notifications_is_read ON notifications(is_read)")
    op.execute("CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id)")
    op.execute("CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id)")
    op.execute("CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audit_logs CASCADE")
    op.execute("DROP TABLE IF EXISTS notifications CASCADE")
    op.execute("DROP TABLE IF EXISTS generated_documents CASCADE")
    op.execute("DROP TABLE IF EXISTS applications CASCADE")
    op.execute("DROP TABLE IF EXISTS scores CASCADE")
    op.execute("DROP TABLE IF EXISTS opportunities CASCADE")
    op.execute("DROP TABLE IF EXISTS resumes CASCADE")
    op.execute("DROP TABLE IF EXISTS profiles CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
    op.execute("DROP TYPE IF EXISTS document_type_enum")
    op.execute("DROP TYPE IF EXISTS application_status_enum")
    op.execute("DROP TYPE IF EXISTS employment_type_enum")
    op.execute("DROP TYPE IF EXISTS remote_preference_enum")
