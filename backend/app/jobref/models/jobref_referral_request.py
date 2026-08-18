from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKey


class JobrefReferralRequest(Base, UUIDPrimaryKey, TimestampMixin):
    """A job seeker's request for a referral at one company, submitted from
    the "Companies available for referrals" tile on their dashboard (see
    pages/ReferralRequest.tsx). Snapshots company_name/company_careers_url
    at submission time rather than pointing at a specific jobref.companies
    row — that table has one row per employee (no dedup, see
    jobref_company.py), so there's no single stable "company" row to point
    at yet, and no routing-to-a-specific-employee logic exists yet either
    (a real design question for later, deliberately not answered here)."""

    __tablename__ = "referral_requests"
    __table_args__ = {"schema": "jobref"}

    seeker_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobref.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_careers_url: Mapped[str] = mapped_column(String(1024), nullable=False)

    # The seeker's name as they want it to appear to the referrer — asked
    # again rather than silently reused from their account, in case they
    # want a different/more formal variant. Prefilled from their profile in
    # the UI (still editable) as a convenience.
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)

    job_link: Mapped[str] = mapped_column(String(1024), nullable=False)
    cv_drive_link: Mapped[str] = mapped_column(String(1024), nullable=False)
    cover_letter_drive_link: Mapped[str] = mapped_column(String(1024), nullable=False)
    # Short note to the referrer — capped at 150 chars per the product spec.
    message: Mapped[str] = mapped_column(String(150), nullable=False)
