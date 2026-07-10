"""Add application_settings table

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-10
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS application_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            setting_name VARCHAR(100) NOT NULL UNIQUE,
            value VARCHAR(255) NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("""
        INSERT INTO application_settings (setting_name, value, description)
        VALUES ('allow_new_registrations', '0', 'Set to 1 to allow new user registrations, 0 to disable.')
        ON CONFLICT (setting_name) DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS application_settings;")
