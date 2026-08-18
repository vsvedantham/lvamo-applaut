"""No duplicate job link per seeker+company on referral requests

Revision ID: 0017
Revises: 0016
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # A seeker can request the same company again on a later day, but not
    # with a job_link they already used there. (The "one referral request
    # per seeker per UTC day" rule is enforced at the application level
    # only, in services/referral_request.py — a DB-level index on
    # created_at::date isn't possible: Postgres won't allow a timestamptz
    # cast to date in an index expression since its result depends on the
    # session timezone setting, so it's not classified IMMUTABLE.)
    op.execute("""
        CREATE UNIQUE INDEX idx_jobref_referral_requests_no_dup_job_link
        ON jobref.referral_requests (seeker_user_id, company_name, job_link);
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS jobref.idx_jobref_referral_requests_no_dup_job_link;")
