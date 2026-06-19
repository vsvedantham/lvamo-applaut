from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey
from app.models.enums import ApplicationStatusEnum


class Application(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "applications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
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
    score_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("scores.id", ondelete="SET NULL")
    )

    status: Mapped[str] = mapped_column(
        sa.Enum(ApplicationStatusEnum, name="application_status_enum", create_type=False),
        nullable=False,
        default=ApplicationStatusEnum.pending_review,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text)
    applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="applications")
    opportunity: Mapped[Opportunity] = relationship(back_populates="applications")
    profile: Mapped[Profile] = relationship(back_populates="applications")
    score: Mapped[Optional[Score]] = relationship(back_populates="applications")
    generated_documents: Mapped[list[GeneratedDocument]] = relationship(
        back_populates="application"
    )


from app.models.user import User  # noqa: E402
from app.models.opportunity import Opportunity  # noqa: E402
from app.models.profile import Profile  # noqa: E402
from app.models.score import Score  # noqa: E402
from app.models.generated_document import GeneratedDocument  # noqa: E402
