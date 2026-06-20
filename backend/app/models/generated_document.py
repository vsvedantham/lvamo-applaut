from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKey
from app.models.enums import DocumentTypeEnum


class GeneratedDocument(Base, UUIDPrimaryKey):
    __tablename__ = "generated_documents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE")
    )
    application_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("applications.id", ondelete="SET NULL")
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        sa.ForeignKey("opportunities.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_resume_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("resumes.id", ondelete="SET NULL")
    )

    document_type: Mapped[str] = mapped_column(
        sa.Enum(DocumentTypeEnum, name="document_type_enum", create_type=False),
        nullable=False,
    )
    generation_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="template")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    file_name: Mapped[Optional[str]] = mapped_column(String(500))
    r2_key: Mapped[Optional[str]] = mapped_column(String(1000))
    ai_model: Mapped[Optional[str]] = mapped_column(String(200))
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )

    application: Mapped[Optional[Application]] = relationship(
        back_populates="generated_documents"
    )
    opportunity: Mapped[Opportunity] = relationship(back_populates="generated_documents")
    source_resume: Mapped[Optional[Resume]] = relationship(
        back_populates="generated_documents"
    )


from app.models.application import Application  # noqa: E402
from app.models.opportunity import Opportunity  # noqa: E402
from app.models.resume import Resume  # noqa: E402
