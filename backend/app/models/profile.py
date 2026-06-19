from __future__ import annotations

import uuid
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import Boolean, SmallInteger, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey
from app.models.enums import EmploymentTypeEnum, RemotePreferenceEnum


class Profile(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_experience_years: Mapped[Optional[int]] = mapped_column(SmallInteger)

    target_roles: Mapped[list] = mapped_column(ARRAY(String), nullable=False, default=list)
    target_countries: Mapped[list] = mapped_column(ARRAY(String), nullable=False, default=list)
    skills: Mapped[list] = mapped_column(ARRAY(String), nullable=False, default=list)
    languages: Mapped[list] = mapped_column(ARRAY(String), nullable=False, default=list)

    remote_preference: Mapped[str] = mapped_column(
        sa.Enum(RemotePreferenceEnum, name="remote_preference_enum", create_type=False),
        nullable=False,
        default=RemotePreferenceEnum.any,
    )
    employment_types: Mapped[list] = mapped_column(ARRAY(String), nullable=False, default=list)

    education: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    certifications: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)

    # Automation schedule
    discovery_frequency_hours: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
        default=24,
        # CHECK (discovery_frequency_hours IN (6, 12, 24)) enforced in migration
    )
    discovery_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user: Mapped[User] = relationship(back_populates="profiles")
    resumes: Mapped[list[Resume]] = relationship(back_populates="profile")
    scores: Mapped[list[Score]] = relationship(back_populates="profile")
    applications: Mapped[list[Application]] = relationship(back_populates="profile")


from app.models.user import User  # noqa: E402
from app.models.resume import Resume  # noqa: E402
from app.models.score import Score  # noqa: E402
from app.models.application import Application  # noqa: E402
