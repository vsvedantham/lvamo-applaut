from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKey
from app.jobref.models.enums import ReferralRequestStatus


class JobrefReferralRequest(Base, UUIDPrimaryKey, TimestampMixin):
    """A job seeker's request for a referral at one company, submitted from
    the "Companies available for referrals" tile on their dashboard (see
    pages/ReferralRequest.tsx).

    Routed to a specific employee (to_user_id) at submission time — see
    services/referral_request.py's routing algorithm (Aug 2026, migration
    0016): among the company's employees, one is picked at random from
    those who haven't hit their own daily_referral_view_cap yet today
    (computed live from today's row count per employee, not a separately
    maintained counter — self-resetting at UTC midnight with no cron
    needed). Snapshots company_name/company_careers_url at submission time
    rather than deriving them via to_user_id, so the record stays accurate
    even if the employee's own company info changes later."""

    __tablename__ = "referral_requests"
    __table_args__ = {"schema": "jobref"}

    seeker_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobref.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    # The employee this request was routed to.
    to_user_id: Mapped[uuid.UUID] = mapped_column(
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

    status: Mapped[ReferralRequestStatus] = mapped_column(
        Enum(
            ReferralRequestStatus,
            name="jobref_referral_request_status",
            native_enum=False,
            length=30,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
        default=ReferralRequestStatus.PENDING_REVIEW,
    )
    # Set once the employee acts on the request — nothing sets this yet
    # (no employee-action endpoint exists in this pass), but the column is
    # ready for when one does.
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
