import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ExperienceEntry(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None


class EducationEntry(BaseModel):
    degree: str
    institution: str
    field: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class CertificationEntry(BaseModel):
    name: str
    issuer: Optional[str] = None
    date: Optional[str] = None


class ExtractedContent(BaseModel):
    skills: list[str] = []
    languages: list[str] = []
    experience: list[ExperienceEntry] = []
    education: list[EducationEntry] = []
    certifications: list[CertificationEntry] = []


class UpdateExtractedContentRequest(BaseModel):
    skills: Optional[list[str]] = None
    languages: Optional[list[str]] = None
    experience: Optional[list[ExperienceEntry]] = None
    education: Optional[list[EducationEntry]] = None
    certifications: Optional[list[CertificationEntry]] = None


class ResumeResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    file_name: str
    is_master: bool
    version: int
    content_extracted: Optional[Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
