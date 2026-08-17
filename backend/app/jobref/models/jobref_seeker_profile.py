from __future__ import annotations

import enum
import uuid
from datetime import date
from typing import Optional

from sqlalchemy import Date, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class JobSeekerStatus(str, enum.Enum):
    NONE = "none"  # not currently employed
    PART_TIME = "part_time"
    MINI_JOB = "mini_job"
    SERVING_NOTICE = "serving_notice"


class JobrefSeekerProfile(Base, TimestampMixin):
    __tablename__ = "jobref_seeker_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobref_users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    current_job_status: Mapped[JobSeekerStatus] = mapped_column(
        Enum(
            JobSeekerStatus,
            name="jobref_job_seeker_status",
            native_enum=False,
            length=20,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
    )
    # Only set when current_job_status is SERVING_NOTICE
    notice_join_date: Mapped[Optional[date]] = mapped_column(Date)
    # Google Drive share link ("anyone with the link") — we don't host the
    # file ourselves.
    cv_drive_link: Mapped[str] = mapped_column(String(1024), nullable=False)

    user: Mapped["JobrefUser"] = relationship(back_populates="seeker_profile")


from app.jobref.models.jobref_user import JobrefUser  # noqa: E402
