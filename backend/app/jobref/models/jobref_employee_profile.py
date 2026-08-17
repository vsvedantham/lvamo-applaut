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


class JobrefEmployeeProfile(Base, TimestampMixin):
    __tablename__ = "jobref_employee_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobref_users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    working_since: Mapped[date] = mapped_column(Date, nullable=False)
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
