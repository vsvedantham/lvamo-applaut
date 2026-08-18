import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from sqlalchemy.exc import IntegrityError

from app.core.security import (
    create_access_token,
    decode_access_token_payload,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.jobref.models.jobref_employee_profile import JobrefEmployeeProfile
from app.jobref.models.jobref_seeker_profile import JobrefSeekerProfile
from app.jobref.models.jobref_user import JobrefUser, JobrefUserType
from app.jobref.schemas.auth import LoginRequest, RegisterRequest
from app.jobref.services.linkedin import decode_registration_token

bearer_scheme = HTTPBearer()

# Stamped on every Jobref access token so it can't be replayed against
# another vertical's protected endpoints (each vertical has its own user
# table/login, per the platform's multi-vertical auth architecture).
TOKEN_VERTICAL = "jobref"


def _issue_token(user_id: uuid.UUID) -> str:
    return create_access_token(user_id, extra_claims={"vertical": TOKEN_VERTICAL})


async def register(payload: RegisterRequest, db: AsyncSession) -> tuple[JobrefUser, str]:
    # Identity (linkedin_id + verified email) always comes from the
    # LinkedIn-issued registration token, never from client-submitted
    # fields — see services/linkedin.py. This is what makes the LinkedIn id
    # dedup meaningful: it can't be spoofed by submitting a different email.
    claims = decode_registration_token(payload.registration_token)

    existing = await db.scalar(
        select(JobrefUser).where(
            (JobrefUser.linkedin_id == claims.linkedin_id) | (JobrefUser.email == claims.email)
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this LinkedIn profile — please sign in instead",
        )

    user = JobrefUser(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=claims.email,
        linkedin_id=claims.linkedin_id,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        user_type=payload.user_type,
        domain=payload.domain,
    )
    db.add(user)
    try:
        await db.flush()  # assign user.id before building the child profile row
    except IntegrityError:
        # Backstop for the race where two requests carrying the same
        # LinkedIn identity flush concurrently — the DB-level UNIQUE
        # constraint on linkedin_id/email is the real guarantee here.
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this LinkedIn profile — please sign in instead",
        )

    if payload.user_type == JobrefUserType.EMPLOYEE:
        details = payload.employee
        assert details is not None  # enforced by RegisterRequest validator
        db.add(
            JobrefEmployeeProfile(
                user_id=user.id,
                company_name=details.company_name,
                working_since=details.working_since,
                can_refer=details.can_refer,
                refer_frequency=details.refer_frequency,
                refer_count=details.refer_count,
                company_careers_url=details.company_careers_url,
            )
        )
    else:
        details = payload.seeker
        assert details is not None  # enforced by RegisterRequest validator
        db.add(
            JobrefSeekerProfile(
                user_id=user.id,
                current_job_status=details.current_job_status,
                notice_join_date=details.notice_join_date,
                cv_drive_link=details.cv_drive_link,
            )
        )

    await db.commit()
    loaded = await _get_with_profiles(db, user.id)
    assert loaded is not None
    return loaded, _issue_token(loaded.id)


async def login(payload: LoginRequest, db: AsyncSession) -> tuple[JobrefUser, str]:
    user = await db.scalar(select(JobrefUser).where(JobrefUser.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )
    return user, _issue_token(user.id)


async def _get_with_profiles(db: AsyncSession, user_id: uuid.UUID) -> JobrefUser | None:
    return await db.scalar(
        select(JobrefUser)
        .where(JobrefUser.id == user_id)
        .options(
            selectinload(JobrefUser.employee_profile),
            selectinload(JobrefUser.seeker_profile),
        )
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> JobrefUser:
    try:
        payload = decode_access_token_payload(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    if payload.get("vertical") != TOKEN_VERTICAL:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = await _get_with_profiles(db, uuid.UUID(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user
