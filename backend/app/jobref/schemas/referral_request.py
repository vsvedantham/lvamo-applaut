from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.jobref.models.enums import ReferralRequestStatus


class ReferralRequestCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    company_careers_url: str = Field(min_length=1, max_length=1024)
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    job_link: str = Field(min_length=1, max_length=1024)
    cv_drive_link: str = Field(min_length=1, max_length=1024)
    cover_letter_drive_link: str = Field(min_length=1, max_length=1024)
    message: str = Field(min_length=1, max_length=150)


class ReferralRequestResponse(BaseModel):
    id: uuid.UUID
    company_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ReferralRequestInboxItem(BaseModel):
    """One row in an employee's referral inbox — see
    GET /api/v1/jobref/referral-requests."""

    id: uuid.UUID
    first_name: str
    last_name: str
    company_name: str
    job_link: str
    cv_drive_link: str
    cover_letter_drive_link: str
    message: str
    status: ReferralRequestStatus
    created_at: datetime

    model_config = {"from_attributes": True}
