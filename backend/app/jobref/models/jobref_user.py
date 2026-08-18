from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy import Boolean, Date, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKey
from app.jobref.models.enums import (
    JobSeekerStatus,
    ReferFrequency,
    ReferralViewCapacity,
)


class JobrefUser(Base, UUIDPrimaryKey, TimestampMixin):
    """Single flat table for both Jobref user types (employee / job
    seeker) — see migration 0013, which merged the former
    jobref_users/jobref_employee_profiles/jobref_seeker_profiles split into
    this one table and moved it into the jobref Postgres schema.

    is_employee is the sole differentiator. Every field only meaningful to
    one type is NULL for the other (defense in depth: mirrored by DB-level
    CHECK constraints in the migration, on top of the Pydantic-level
    conditional validation in schemas/auth.py)."""

    __tablename__ = "users"
    __table_args__ = {"schema": "jobref"}

    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # LinkedIn's stable member id — job seekers only (employees register
    # directly, no LinkedIn). NULL for employees; UNIQUE still holds since
    # Postgres allows multiple NULLs.
    linkedin_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    is_employee: Mapped[bool] = mapped_column(Boolean, nullable=False)
    # Professional field / industry (e.g. "Data Engineering") — same concept
    # for employees and job seekers, free text.
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # --- Employee-only fields. NULL for job seekers. ---
    company_name: Mapped[Optional[str]] = mapped_column(String(255))
    working_since: Mapped[Optional[date]] = mapped_column(Date)
    daily_referral_view_cap: Mapped[Optional[ReferralViewCapacity]] = mapped_column(
        Enum(
            ReferralViewCapacity,
            name="jobref_referral_view_capacity",
            native_enum=False,
            length=10,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        )
    )
    refer_frequency: Mapped[Optional[ReferFrequency]] = mapped_column(
        Enum(
            ReferFrequency,
            name="jobref_refer_frequency",
            native_enum=False,
            length=10,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        )
    )
    referral_capacity: Mapped[Optional[ReferralViewCapacity]] = mapped_column(
        Enum(
            ReferralViewCapacity,
            # Distinct name from daily_referral_view_cap's column above even
            # though it's the same Python enum/value set — two CHECK
            # constraints on the same table need distinct names.
            name="jobref_referral_capacity",
            native_enum=False,
            length=10,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        )
    )
    company_careers_url: Mapped[Optional[str]] = mapped_column(String(1024))

    # --- Job-seeker-only fields. NULL for employees. ---
    current_job_status: Mapped[Optional[JobSeekerStatus]] = mapped_column(
        Enum(
            JobSeekerStatus,
            name="jobref_job_seeker_status",
            native_enum=False,
            length=20,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        )
    )
    # Only set when current_job_status is SERVING_NOTICE
    notice_join_date: Mapped[Optional[date]] = mapped_column(Date)
    # Google Drive share link ("anyone with the link") — we don't host the
    # file ourselves.
    cv_drive_link: Mapped[Optional[str]] = mapped_column(String(1024))
