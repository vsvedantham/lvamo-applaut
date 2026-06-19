from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class User(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    profiles: Mapped[list[Profile]] = relationship(back_populates="user")
    resumes: Mapped[list[Resume]] = relationship(back_populates="user")
    applications: Mapped[list[Application]] = relationship(back_populates="user")
    notifications: Mapped[list[Notification]] = relationship(back_populates="user")
    audit_logs: Mapped[list[AuditLog]] = relationship(back_populates="user")


# Deferred imports to avoid circular references
from app.models.profile import Profile  # noqa: E402
from app.models.resume import Resume  # noqa: E402
from app.models.application import Application  # noqa: E402
from app.models.notification import Notification  # noqa: E402
from app.models.audit_log import AuditLog  # noqa: E402
