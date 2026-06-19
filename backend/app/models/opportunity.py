from __future__ import annotations

from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey
from app.models.enums import EmploymentTypeEnum, RemotePreferenceEnum


class Opportunity(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "opportunities"
    __table_args__ = (sa.UniqueConstraint("source", "external_id"),)

    source: Mapped[str] = mapped_column(String(100), nullable=False)
    external_id: Mapped[str] = mapped_column(String(500), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    company_name: Mapped[str] = mapped_column(String(500), nullable=False)
    location_raw: Mapped[Optional[str]] = mapped_column(String(500))
    country_code: Mapped[Optional[str]] = mapped_column(String(10))

    remote_option: Mapped[Optional[str]] = mapped_column(
        sa.Enum(RemotePreferenceEnum, name="remote_preference_enum", create_type=False)
    )
    employment_type: Mapped[Optional[str]] = mapped_column(
        sa.Enum(EmploymentTypeEnum, name="employment_type_enum", create_type=False)
    )

    description: Mapped[Optional[str]] = mapped_column(Text)
    requirements: Mapped[Optional[str]] = mapped_column(Text)
    salary_min: Mapped[Optional[int]] = mapped_column(Integer)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer)
    salary_currency: Mapped[Optional[str]] = mapped_column(String(10))
    application_url: Mapped[Optional[str]] = mapped_column(String(2000))
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    raw_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    scores: Mapped[list[Score]] = relationship(back_populates="opportunity")
    applications: Mapped[list[Application]] = relationship(back_populates="opportunity")
    generated_documents: Mapped[list[GeneratedDocument]] = relationship(
        back_populates="opportunity"
    )


from app.models.score import Score  # noqa: E402
from app.models.application import Application  # noqa: E402
from app.models.generated_document import GeneratedDocument  # noqa: E402
