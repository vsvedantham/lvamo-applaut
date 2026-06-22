import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CreateApplicationRequest(BaseModel):
    opportunity_id: uuid.UUID
    score_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class UpdateApplicationRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    opportunity_id: uuid.UUID
    profile_id: uuid.UUID
    score_id: Optional[uuid.UUID]
    status: str
    notes: Optional[str]
    applied_at: Optional[datetime]
    submitted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Denormalised opportunity fields for convenience
    opportunity_title: str = ""
    opportunity_company: str = ""
    opportunity_location: Optional[str] = None
    opportunity_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ApplicationListResponse(BaseModel):
    items: list[ApplicationResponse]
    total: int
