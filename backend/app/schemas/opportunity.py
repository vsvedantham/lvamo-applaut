import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OpportunityResponse(BaseModel):
    id: uuid.UUID
    source: str
    title: str
    company_name: str
    location_raw: Optional[str]
    country_code: Optional[str]
    remote_option: Optional[str]
    employment_type: Optional[str]
    application_url: Optional[str]
    posted_at: Optional[datetime]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OpportunityDetailResponse(OpportunityResponse):
    description: Optional[str]
    requirements: Optional[str]
    salary_min: Optional[int]
    salary_max: Optional[int]
    salary_currency: Optional[str]


class DiscoveryRunResponse(BaseModel):
    new_jobs_found: int
    message: str


class OpportunityListResponse(BaseModel):
    items: list[OpportunityResponse]
    total: int
    page: int
    page_size: int
