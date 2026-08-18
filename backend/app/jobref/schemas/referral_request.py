from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


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
