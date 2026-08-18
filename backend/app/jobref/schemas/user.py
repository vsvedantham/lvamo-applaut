from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.jobref.models.jobref_employee_profile import ReferFrequency, ReferralViewCapacity
from app.jobref.models.jobref_seeker_profile import JobSeekerStatus
from app.jobref.models.jobref_user import JobrefUserType


class EmployeeProfileResponse(BaseModel):
    company_name: str
    working_since: date
    daily_referral_view_cap: ReferralViewCapacity
    refer_frequency: ReferFrequency
    referral_capacity: ReferralViewCapacity
    company_careers_url: str

    model_config = {"from_attributes": True}


class SeekerProfileResponse(BaseModel):
    current_job_status: JobSeekerStatus
    notice_join_date: Optional[date]
    cv_drive_link: str

    model_config = {"from_attributes": True}


class JobrefUserResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    user_type: JobrefUserType
    domain: str
    is_active: bool
    created_at: datetime
    employee_profile: Optional[EmployeeProfileResponse] = None
    seeker_profile: Optional[SeekerProfileResponse] = None

    model_config = {"from_attributes": True}
