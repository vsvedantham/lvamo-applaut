import random
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.jobref.models.enums import ReferralViewCapacity
from app.jobref.models.jobref_company import JobrefCompany
from app.jobref.models.jobref_referral_request import JobrefReferralRequest
from app.jobref.models.jobref_user import JobrefUser
from app.jobref.schemas.referral_request import ReferralRequestCreate

# The upper bound of each bucketed daily_referral_view_cap value, used as
# that employee's effective daily cap for routing purposes — e.g. an
# employee who chose "5_to_10" is treated as willing to take up to 10
# today. NO_CAP employees have no ceiling at all (None).
_CAP_UPPER_BOUND: dict[ReferralViewCapacity, int | None] = {
    ReferralViewCapacity.UP_TO_5: 5,
    ReferralViewCapacity.FIVE_TO_TEN: 10,
    ReferralViewCapacity.TEN_TO_TWENTY: 20,
    ReferralViewCapacity.NO_CAP: None,
}


async def _find_eligible_referrer(
    db: AsyncSession, company_name: str, company_careers_url: str
) -> JobrefUser | None:
    """Among the employees who registered this company, pick one at random
    from those who haven't hit their own daily_referral_view_cap yet today
    (UTC calendar day). Returns None if the company has no employees at
    all, or if every employee there is already at capacity for today."""
    employees = (
        await db.scalars(
            select(JobrefUser)
            .join(JobrefCompany, JobrefCompany.user_id == JobrefUser.id)
            .where(
                JobrefCompany.name == company_name,
                JobrefCompany.careers_url == company_careers_url,
            )
        )
    ).all()
    if not employees:
        return None

    today = datetime.now(timezone.utc).date()
    eligible: list[JobrefUser] = []
    for employee in employees:
        cap = _CAP_UPPER_BOUND[employee.daily_referral_view_cap]
        if cap is None:
            eligible.append(employee)
            continue
        # Computed live from today's rows rather than a maintained counter
        # — self-resets at UTC midnight, no cron/reset job needed.
        today_count = await db.scalar(
            select(func.count())
            .select_from(JobrefReferralRequest)
            .where(
                JobrefReferralRequest.to_user_id == employee.id,
                func.date(JobrefReferralRequest.created_at) == today,
            )
        )
        if (today_count or 0) < cap:
            eligible.append(employee)

    if not eligible:
        return None
    return random.choice(eligible)


async def create_referral_request(
    payload: ReferralRequestCreate, seeker: JobrefUser, db: AsyncSession
) -> JobrefReferralRequest:
    today = datetime.now(timezone.utc).date()

    # One referral request per seeker per UTC calendar day, across any
    # company — checked before anything else since it's the cheapest,
    # most fundamental gate.
    sent_today = await db.scalar(
        select(func.count())
        .select_from(JobrefReferralRequest)
        .where(
            JobrefReferralRequest.seeker_user_id == seeker.id,
            func.date(JobrefReferralRequest.created_at) == today,
        )
    )
    if sent_today:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You can only send one referral request per day. Try again after 00:00 UTC.",
        )

    # Re-requesting the same company on a later day is fine, but not with
    # a job posting link already used there.
    duplicate = await db.scalar(
        select(JobrefReferralRequest).where(
            JobrefReferralRequest.seeker_user_id == seeker.id,
            JobrefReferralRequest.company_name == payload.company_name,
            JobrefReferralRequest.job_link == payload.job_link,
        )
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "You've already sent a referral request for this exact job "
                "posting at this company — use a different job posting link."
            ),
        )

    referrer = await _find_eligible_referrer(db, payload.company_name, payload.company_careers_url)
    if referrer is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This company has reached its daily referral capacity — "
                "please try again tomorrow, or pick another company."
            ),
        )

    request = JobrefReferralRequest(
        seeker_user_id=seeker.id,
        to_user_id=referrer.id,
        **payload.model_dump(),
    )
    db.add(request)
    try:
        await db.commit()
    except IntegrityError:
        # Backstop for the race between two near-simultaneous requests from
        # the same seeker — the DB-level UNIQUE indexes (migration 0017)
        # are the real guarantee here.
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That referral request couldn't be sent — please refresh and try again.",
        )
    await db.refresh(request)
    return request


async def list_inbox(employee_id: uuid.UUID, db: AsyncSession) -> list[JobrefReferralRequest]:
    stmt = (
        select(JobrefReferralRequest)
        .where(JobrefReferralRequest.to_user_id == employee_id)
        .order_by(JobrefReferralRequest.created_at.desc())
    )
    return list((await db.scalars(stmt)).all())


async def list_my_requests(seeker_id: uuid.UUID, db: AsyncSession) -> list[JobrefReferralRequest]:
    """A seeker's own sent requests — symmetric to list_inbox, used both
    for the "already requested" company badge and the daily-limit note on
    Dashboard.tsx."""
    stmt = (
        select(JobrefReferralRequest)
        .where(JobrefReferralRequest.seeker_user_id == seeker_id)
        .order_by(JobrefReferralRequest.created_at.desc())
    )
    return list((await db.scalars(stmt)).all())
