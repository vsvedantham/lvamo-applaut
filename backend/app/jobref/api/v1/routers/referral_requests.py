import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.jobref.models.jobref_user import JobrefUser
from app.jobref.schemas.referral_request import (
    ReferralRequestCreate,
    ReferralRequestDetail,
    ReferralRequestInboxItem,
    ReferralRequestResponse,
    RejectRequestPayload,
)
from app.jobref.services.auth import get_current_user
from app.jobref.services.referral_request import (
    accept_referral_request,
    count_for_job_posting,
    count_from_seeker,
    create_referral_request,
    get_evidence_url,
    get_request_detail,
    list_inbox,
    list_my_requests,
    reject_referral_request,
)

router = APIRouter(prefix="/referral-requests")


@router.post("", response_model=ReferralRequestResponse, status_code=status.HTTP_201_CREATED)
async def submit_referral_request(
    payload: ReferralRequestCreate,
    current_user: JobrefUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Unlike the read-only /companies list, this write endpoint does
    # restrict by user type — a referral request only makes sense coming
    # from a job seeker.
    if current_user.is_employee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only job seekers can submit referral requests",
        )
    return await create_referral_request(payload, current_user, db)


@router.get("", response_model=list[ReferralRequestInboxItem])
async def my_referral_requests(
    current_user: JobrefUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Dual-purpose, like /auth/me: an employee's own inbox (requests
    # routed to them), or a seeker's own sent-request history (used for
    # the "already requested" company badge and the daily-limit note on
    # Dashboard.tsx).
    if current_user.is_employee:
        return await list_inbox(current_user.id, db)
    return await list_my_requests(current_user.id, db)


def _require_employee(current_user: JobrefUser) -> None:
    if not current_user.is_employee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can review referral requests",
        )


async def _to_detail(request, db: AsyncSession) -> ReferralRequestDetail:
    job_count = await count_for_job_posting(request.company_name, request.job_link, db)
    seeker_count = await count_from_seeker(request.seeker_user_id, request.to_user_id, db)
    return ReferralRequestDetail(
        id=request.id,
        seeker_user_id=request.seeker_user_id,
        first_name=request.first_name,
        last_name=request.last_name,
        company_name=request.company_name,
        job_link=request.job_link,
        cv_drive_link=request.cv_drive_link,
        cover_letter_drive_link=request.cover_letter_drive_link,
        message=request.message,
        status=request.status,
        rejection_reason=request.rejection_reason,
        evidence_file_name=request.evidence_file_name,
        created_at=request.created_at,
        reviewed_at=request.reviewed_at,
        job_posting_request_count=job_count,
        seeker_request_count=seeker_count,
    )


@router.get("/{request_id}", response_model=ReferralRequestDetail)
async def referral_request_detail(
    request_id: uuid.UUID,
    current_user: JobrefUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_employee(current_user)
    request = await get_request_detail(request_id, current_user, db)
    return await _to_detail(request, db)


@router.post("/{request_id}/accept", response_model=ReferralRequestDetail)
async def accept_request(
    request_id: uuid.UUID,
    evidence: UploadFile | None = File(None),
    current_user: JobrefUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_employee(current_user)
    request = await accept_referral_request(request_id, current_user, evidence, db)
    return await _to_detail(request, db)


@router.post("/{request_id}/reject", response_model=ReferralRequestDetail)
async def reject_request(
    request_id: uuid.UUID,
    payload: RejectRequestPayload,
    current_user: JobrefUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_employee(current_user)
    request = await reject_referral_request(request_id, current_user, payload.reason, db)
    return await _to_detail(request, db)


@router.get("/{request_id}/evidence")
async def referral_request_evidence_url(
    request_id: uuid.UUID,
    current_user: JobrefUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Open to either party on the request (the seeker it belongs to, or the
    # employee it's routed to) — no is_employee gate here, unlike the
    # review endpoints above.
    url = await get_evidence_url(request_id, current_user, db)
    return {"url": url}
