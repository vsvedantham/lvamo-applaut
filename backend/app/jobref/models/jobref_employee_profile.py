from __future__ import annotations

import enum
import uuid
from datetime import date
from typing import Optional

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ReferFrequency(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ReferralViewCapacity(str, enum.Enum):
    """How many incoming referral requests (from job seekers) an employee
    is willing to look at per day — distinct from can_refer/refer_frequency
    below, which is about how many candidates they'll actively refer."""

    UP_TO_5 = "up_to_5"
    FIVE_TO_TEN = "5_to_10"
    TEN_TO_TWENTY = "10_to_20"
    NO_CAP = "no_cap"


class JobrefEmployeeProfile(Base, TimestampMixin):
    __tablename__ = "jobref_employee_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobref_users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    working_since: Mapped[date] = mapped_column(Date, nullable=False)
    daily_referral_view_cap: Mapped[ReferralViewCapacity] = mapped_column(
        Enum(
            ReferralViewCapacity,
            name="jobref_referral_view_capacity",
            native_enum=False,
            length=10,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
    )
    can_refer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Only set when can_refer is true
    refer_frequency: Mapped[Optional[ReferFrequency]] = mapped_column(
        Enum(
            ReferFrequency,
            name="jobref_refer_frequency",
            native_enum=False,
            length=10,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        )
    )
    refer_count: Mapped[Optional[int]] = mapped_column(Integer)
    company_careers_url: Mapped[str] = mapped_column(String(1024), nullable=False)

    user: Mapped["JobrefUser"] = relationship(back_populates="employee_profile")


from app.jobref.models.jobref_user import JobrefUser  # noqa: E402
