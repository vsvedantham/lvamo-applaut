from __future__ import annotations

import uuid
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import Boolean, SmallInteger, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class Resume(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "resumes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="SET NULL")
    )
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    r2_key: Mapped[str] = mapped_column(String(1000), nullable=False)
    content_extracted: Mapped[Optional[dict]] = mapped_column(JSONB)
    is_master: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    version: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)

    user: Mapped[User] = relationship(back_populates="resumes")
    profile: Mapped[Optional[Profile]] = relationship(back_populates="resumes")
    generated_documents: Mapped[list[GeneratedDocument]] = relationship(
        back_populates="source_resume"
    )


from app.models.user import User  # noqa: E402
from app.models.profile import Profile  # noqa: E402
from app.models.generated_document import GeneratedDocument  # noqa: E402
