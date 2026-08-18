from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.jobref.models.enums import (
    JobSeekerStatus,
    JobrefUserType,
    ReferFrequency,
    ReferralViewCapacity,
)
from app.jobref.models.jobref_user import JobrefUser


class EmployeeProfileResponse(BaseModel):
    company_name: str
    working_since: date
    daily_referral_view_cap: ReferralViewCapacity
    refer_frequency: ReferFrequency
    referral_capacity: ReferralViewCapacity
    company_careers_url: str


class SeekerProfileResponse(BaseModel):
    current_job_status: JobSeekerStatus
    notice_join_date: Optional[date]
    cv_drive_link: str


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

    @classmethod
    def from_user(cls, user: JobrefUser) -> "JobrefUserResponse":
        # jobref.users is a single flat table with is_employee as the sole
        # differentiator (see migration 0013) — this reshapes it back into
        # the nested employee_profile/seeker_profile response the frontend
        # already expects, so the table merge required zero frontend changes.
        return cls(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            phone=user.phone,
            user_type=JobrefUserType.EMPLOYEE if user.is_employee else JobrefUserType.JOB_SEEKER,
            domain=user.domain,
            is_active=user.is_active,
            created_at=user.created_at,
            employee_profile=(
                EmployeeProfileResponse(
                    company_name=user.company_name,
                    working_since=user.working_since,
                    daily_referral_view_cap=user.daily_referral_view_cap,
                    refer_frequency=user.refer_frequency,
                    referral_capacity=user.referral_capacity,
                    company_careers_url=user.company_careers_url,
                )
                if user.is_employee
                else None
            ),
            seeker_profile=(
                SeekerProfileResponse(
                    current_job_status=user.current_job_status,
                    notice_join_date=user.notice_join_date,
                    cv_drive_link=user.cv_drive_link,
                )
                if not user.is_employee
                else None
            ),
        )
