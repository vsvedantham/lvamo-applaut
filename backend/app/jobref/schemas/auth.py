from __future__ import annotations

import re
from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.jobref.models.jobref_employee_profile import ReferFrequency
from app.jobref.models.jobref_seeker_profile import JobSeekerStatus
from app.jobref.models.jobref_user import JobrefUserType

# Loose German phone number check: optional +49/0049/0 prefix, then 6-14
# digits (spaces/hyphens allowed for readability).
GERMAN_PHONE_RE = re.compile(r"^(?:\+49|0049|0)[0-9 \-]{6,14}$")


class EmployeeDetails(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    working_since: date
    can_refer: bool
    refer_frequency: Optional[ReferFrequency] = None
    refer_count: Optional[int] = Field(default=None, ge=1)
    company_careers_url: str = Field(min_length=1, max_length=1024)

    @model_validator(mode="after")
    def check_refer_fields(self) -> "EmployeeDetails":
        if self.can_refer:
            if self.refer_frequency is None or self.refer_count is None:
                raise ValueError(
                    "refer_frequency and refer_count are required when can_refer is true"
                )
        else:
            self.refer_frequency = None
            self.refer_count = None
        return self


class SeekerDetails(BaseModel):
    current_job_status: JobSeekerStatus
    notice_join_date: Optional[date] = None
    cv_drive_link: str = Field(min_length=1, max_length=1024)

    @model_validator(mode="after")
    def check_notice_date(self) -> "SeekerDetails":
        if self.current_job_status == JobSeekerStatus.SERVING_NOTICE:
            if self.notice_join_date is None:
                raise ValueError(
                    "notice_join_date is required when current_job_status is serving_notice"
                )
        else:
            self.notice_join_date = None
        return self


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str
    password: str = Field(min_length=8)
    user_type: JobrefUserType
    domain: str = Field(min_length=1, max_length=255)
    employee: Optional[EmployeeDetails] = None
    seeker: Optional[SeekerDetails] = None

    @model_validator(mode="after")
    def check_phone_and_type_details(self) -> "RegisterRequest":
        if not GERMAN_PHONE_RE.match(self.phone.strip()):
            raise ValueError("phone must be a valid German phone number")
        if self.user_type == JobrefUserType.EMPLOYEE:
            if self.employee is None:
                raise ValueError("employee details are required for user_type=employee")
            self.seeker = None
        else:
            if self.seeker is None:
                raise ValueError("seeker details are required for user_type=job_seeker")
            self.employee = None
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
