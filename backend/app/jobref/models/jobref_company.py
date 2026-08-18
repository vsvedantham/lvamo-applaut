from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKey


class JobrefCompany(Base, UUIDPrimaryKey, TimestampMixin):
    """A company captured at employee-registration time — the seed for the
    future referral-matching feature (a job seeker will eventually browse
    this table to find companies with employees willing to refer).

    One row per employee registration for now (user_id is UNIQUE): if two
    employees at the same company both register, they each get their own
    row rather than being deduplicated onto one company. Whether/how to
    dedupe is deliberately deferred to when the matching feature itself
    gets designed — this table has its own id (not user_id as PK) so that
    can change later without disturbing anything that comes to reference a
    company by its own identity."""

    __tablename__ = "companies"
    __table_args__ = {"schema": "jobref"}

    # The employee who registered this company entry.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobref.users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    careers_url: Mapped[str] = mapped_column(String(1024), nullable=False)
