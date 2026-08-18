"""Create applaut/jobref schemas; move existing Applaut tables + enum types into applaut

Revision ID: 0012
Revises: 0011
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Applaut's tables, all currently in `public`. Jobref's tables
# (jobref_users, jobref_employee_profiles, jobref_seeker_profiles) stay in
# `public` for now — moving them into the `jobref` schema is a separate,
# later task.
APPLAUT_TABLES = [
    "users",
    "profiles",
    "resumes",
    "opportunities",
    "scores",
    "applications",
    "generated_documents",
    "notifications",
    "audit_logs",
    "application_settings",
]

APPLAUT_ENUM_TYPES = [
    "remote_preference_enum",
    "employment_type_enum",
    "application_status_enum",
    "document_type_enum",
]


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS applaut")
    op.execute("CREATE SCHEMA IF NOT EXISTS jobref")

    for table in APPLAUT_TABLES:
        op.execute(f"ALTER TABLE public.{table} SET SCHEMA applaut")

    for enum_type in APPLAUT_ENUM_TYPES:
        op.execute(f"ALTER TYPE public.{enum_type} SET SCHEMA applaut")


def downgrade() -> None:
    for enum_type in APPLAUT_ENUM_TYPES:
        op.execute(f"ALTER TYPE applaut.{enum_type} SET SCHEMA public")

    for table in APPLAUT_TABLES:
        op.execute(f"ALTER TABLE applaut.{table} SET SCHEMA public")

    op.execute("DROP SCHEMA IF EXISTS jobref")
    op.execute("DROP SCHEMA IF EXISTS applaut")
