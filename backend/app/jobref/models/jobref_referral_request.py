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
    # Set when the employee makes a final decision (accept or reject) —
    # not when merely opened (that's what UNDER_REVIEW itself signals).
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Required when status is REJECTED, absent otherwise (see migration
    # 0018's CHECK constraint). Free text, 150-char cap per the product
    # spec — the frontend offers canned suggestions but doesn't constrain
    # to them.
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(150))

    # Both set together when the employee opts to share referral evidence
    # on accept, both absent otherwise — optional, per the spec ("if no,
    # no worries"). r2_key follows the same "local/" prefix convention as
    # Applaut's resume uploads when R2 isn't configured (see
    # services/referral_request.py).
    evidence_r2_key: Mapped[Optional[str]] = mapped_column(String(1000))
    evidence_file_name: Mapped[Optional[str]] = mapped_column(String(500))
