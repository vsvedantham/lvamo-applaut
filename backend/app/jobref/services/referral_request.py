import random
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.storage import generate_presigned_url, upload_file
from app.jobref.models.enums import ReferralRequestStatus, ReferralViewCapacity
from app.jobref.models.jobref_company import JobrefCompany
from app.jobref.models.jobref_referral_request import JobrefReferralRequest
from app.jobref.models.jobref_user import JobrefUser
from app.jobref.schemas.referral_request import ReferralRequestCreate

# Evidence of a completed referral is meant to be a screenshot/photo of
# something concrete (an email sent, a form filled, a response received) —
# images plus PDF covers that without opening up arbitrary file types.
# Same 5 MB ceiling as Applaut's resume uploads.
EVIDENCE_MAX_FILE_SIZE = 5 * 1024 * 1024
EVIDENCE_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}

_DECIDED_STATUSES = {ReferralRequestStatus.ACCEPTED, ReferralRequestStatus.REJECTED}

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
    """Among the *active* employees who registered this company, pick one
    at random from those who haven't hit their own daily_referral_view_cap
    yet today (UTC calendar day). Returns None if the company has no active
    employees at all, or if every active employee there is already at
    capacity for today. An inactive employee (e.g. no longer at the
    company) is excluded here the same way they're excluded from the
    companies listing — they can't log in to review a request anyway."""
    employees = (
        await db.scalars(
            select(JobrefUser)
            .join(JobrefCompany, JobrefCompany.user_id == JobrefUser.id)
            .where(
                JobrefCompany.name == company_name,
                JobrefCompany.careers_url == company_careers_url,
                JobrefUser.is_active.is_(True),
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


async def _get_owned_request(
    request_id: uuid.UUID, employee: JobrefUser, db: AsyncSession
) -> JobrefReferralRequest:
    """Fetch a request, verifying it's actually routed to this employee —
    shared by the detail/accept/reject endpoints so none of them can be
    used to read or act on someone else's inbox item."""
    request = await db.get(JobrefReferralRequest, request_id)
    if not request or request.to_user_id != employee.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referral request not found")
    return request


async def count_for_job_posting(company_name: str, job_link: str, db: AsyncSession) -> int:
    return (
        await db.scalar(
            select(func.count())
            .select_from(JobrefReferralRequest)
            .where(
                JobrefReferralRequest.company_name == company_name,
                JobrefReferralRequest.job_link == job_link,
            )
        )
        or 0
    )


async def count_from_seeker(seeker_id: uuid.UUID, employee_id: uuid.UUID, db: AsyncSession) -> int:
    return (
        await db.scalar(
            select(func.count())
            .select_from(JobrefReferralRequest)
            .where(
                JobrefReferralRequest.seeker_user_id == seeker_id,
                JobrefReferralRequest.to_user_id == employee_id,
            )
        )
        or 0
    )


async def get_request_detail(
    request_id: uuid.UUID, employee: JobrefUser, db: AsyncSession
) -> JobrefReferralRequest:
    """Opening the request is what moves it from PENDING_REVIEW to
    UNDER_REVIEW — a side effect of the read, matching the "opening an
    email marks it read" pattern the product spec describes. Idempotent:
    re-opening an already-under-review (or decided) request changes
    nothing."""
    request = await _get_owned_request(request_id, employee, db)
    if request.status == ReferralRequestStatus.PENDING_REVIEW:
        request.status = ReferralRequestStatus.UNDER_REVIEW
        await db.commit()
        await db.refresh(request)
    return request


async def accept_referral_request(
    request_id: uuid.UUID,
    employee: JobrefUser,
    evidence: UploadFile | None,
    db: AsyncSession,
) -> JobrefReferralRequest:
    request = await _get_owned_request(request_id, employee, db)
    if request.status in _DECIDED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This request has already been decided.",
        )

    if evidence is not None:
        if evidence.content_type not in EVIDENCE_ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Evidence must be a JPEG/PNG/WebP image or a PDF.",
            )
        data = await evidence.read()
        if len(data) > EVIDENCE_MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Evidence file must not exceed 5 MB.",
            )
        r2_key = f"jobref/referral-evidence/{request.id}/{uuid.uuid4()}/{evidence.filename}"
        if settings.r2_bucket_name:
            upload_file(r2_key, data, evidence.content_type)
        else:
            # Same convention as Applaut's resume uploads: don't attempt a
            # doomed network call when R2 isn't configured, just mark
            # where the key would have gone.
            r2_key = f"local/{r2_key}"
        request.evidence_r2_key = r2_key
        request.evidence_file_name = evidence.filename or "evidence"

    request.status = ReferralRequestStatus.ACCEPTED
    request.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(request)
    return request


async def reject_referral_request(
    request_id: uuid.UUID, employee: JobrefUser, reason: str, db: AsyncSession
) -> JobrefReferralRequest:
    request = await _get_owned_request(request_id, employee, db)
    if request.status in _DECIDED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This request has already been decided.",
        )

    request.status = ReferralRequestStatus.REJECTED
    request.rejection_reason = reason
    request.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(request)
    return request


EVIDENCE_URL_EXPIRES_IN = 300  # 5 minutes — short-lived, re-requested per click rather than cached


async def get_evidence_url(request_id: uuid.UUID, user: JobrefUser, db: AsyncSession) -> str:
    """Either party on the request (the seeker it belongs to, or the
    employee it's routed to) can view the evidence — not just whichever
    endpoint's own dependency happens to require one type. 404s rather
    than 403s for a request that exists but isn't the caller's own, same
    reasoning as _get_owned_request: don't reveal existence to a caller
    with no legitimate claim to it."""
    request = await db.get(JobrefReferralRequest, request_id)
    if not request or (request.seeker_user_id != user.id and request.to_user_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referral request not found")
    if not request.evidence_r2_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No evidence was shared for this request")
    if request.evidence_r2_key.startswith("local/"):
        # Same convention as the upload side: don't attempt a doomed R2
        # call when it was never actually uploaded there in the first place.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence storage isn't available in this environment",
        )
    return generate_presigned_url(request.evidence_r2_key, expires_in=EVIDENCE_URL_EXPIRES_IN)
