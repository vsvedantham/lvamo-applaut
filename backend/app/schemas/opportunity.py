import uuid
from datetime import datetime
from typing import Any, Optional

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


class OpportunityScoreInfo(BaseModel):
    id: uuid.UUID
    total_score: int
    explanation: Any
    scoring_mode: str
    near_miss_keywords: Optional[Any]
    user_decision: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class OpportunityWithScoreResponse(OpportunityResponse):
    score: Optional[OpportunityScoreInfo] = None


class DiscoveryRunResponse(BaseModel):
    new_jobs_found: int
    scored: int
    good_matches: int
    near_misses: int
    message: str


class OpportunityListResponse(BaseModel):
    items: list[OpportunityWithScoreResponse]
    total: int
    page: int
    page_size: int
    good_threshold: int
    near_miss_threshold: int
