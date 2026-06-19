from __future__ import annotations

import uuid
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import SmallInteger, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class Score(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "scores"
    __table_args__ = (sa.UniqueConstraint("opportunity_id", "profile_id"),)

    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        sa.ForeignKey("opportunities.id", ondelete="CASCADE"),
        nullable=False,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        sa.ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    total_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    skills_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    experience_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    location_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    employment_type_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    education_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    languages_score: Mapped[Optional[int]] = mapped_column(SmallInteger)

    explanation: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ai_model: Mapped[Optional[str]] = mapped_column(String(200))

    opportunity: Mapped[Opportunity] = relationship(back_populates="scores")
    profile: Mapped[Profile] = relationship(back_populates="scores")
    applications: Mapped[list[Application]] = relationship(back_populates="score")


from app.models.opportunity import Opportunity  # noqa: E402
from app.models.profile import Profile  # noqa: E402
from app.models.application import Application  # noqa: E402
