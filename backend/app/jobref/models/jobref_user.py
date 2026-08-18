from __future__ import annotations

import enum
from typing import Optional

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKey


class JobrefUserType(str, enum.Enum):
    EMPLOYEE = "employee"
    JOB_SEEKER = "job_seeker"


class JobrefUser(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "jobref_users"

    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # LinkedIn's stable member id ("sub" claim from the OIDC userinfo
    # response) — the source of truth for "has this person already
    # registered" for job seekers, since it can't change the way an email
    # address can. Only job seekers go through LinkedIn OAuth (product
    # decision, Aug 2026) — employees register directly, so this is NULL
    # for them. UNIQUE still holds: Postgres allows multiple NULLs.
    linkedin_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    user_type: Mapped[JobrefUserType] = mapped_column(
        Enum(
            JobrefUserType,
            name="jobref_user_type",
            native_enum=False,
            length=20,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
    )
    # Professional field / industry (e.g. "Data Engineering") — same concept
    # for employees and job seekers, free text.
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    employee_profile: Mapped[Optional["JobrefEmployeeProfile"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    seeker_profile: Mapped[Optional["JobrefSeekerProfile"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


# Deferred imports to avoid circular references
from app.jobref.models.jobref_employee_profile import JobrefEmployeeProfile  # noqa: E402
from app.jobref.models.jobref_seeker_profile import JobrefSeekerProfile  # noqa: E402
