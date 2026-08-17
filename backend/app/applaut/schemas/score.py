import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ScoringRunResponse(BaseModel):
    scored: int
    good_matches: int
    near_misses: int
    below_threshold: int
    mode: str


class ScoreResponse(BaseModel):
    id: uuid.UUID
    opportunity_id: uuid.UUID
    profile_id: uuid.UUID
    total_score: int
    skills_score: Optional[int]
    experience_score: Optional[int]
    location_score: Optional[int]
    employment_type_score: Optional[int]
    explanation: Any
    scoring_mode: str
    near_miss_keywords: Optional[Any]
    user_decision: Optional[str]
    ai_model: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ScoreWithOpportunityResponse(ScoreResponse):
    opportunity_title: str = ""
    opportunity_company: str = ""
    opportunity_location: Optional[str] = None
    opportunity_url: Optional[str] = None


class ScoreListResponse(BaseModel):
    items: list[ScoreResponse]
    total: int
    page: int
    page_size: int


class DecideNearMissRequest(BaseModel):
    action: str
    keywords_to_add: list[str] = []
