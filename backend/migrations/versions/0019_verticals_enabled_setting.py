"""Add verticals_enabled application_settings row

Revision ID: 0019
Revises: 0018
Create Date: 2026-08-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO applaut.application_settings (setting_name, value, description)
        VALUES (
            'verticals_enabled',
            'jobref',
            'Comma-separated, lowercase list of vertical names to show as cards on the LVAMO hub (frontend/src/pages/Hub.tsx). Verticals not listed here stay fully reachable by direct URL — this only controls hub visibility.'
        )
        ON CONFLICT (setting_name) DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM applaut.application_settings WHERE setting_name = 'verticals_enabled';
    """)
