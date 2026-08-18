from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.jobref.models.jobref_user import JobrefUser
from app.jobref.schemas.referral_request import (
    ReferralRequestCreate,
    ReferralRequestInboxItem,
    ReferralRequestResponse,
)
from app.jobref.services.auth import get_current_user
from app.jobref.services.referral_request import (
    create_referral_request,
    list_inbox,
    list_my_requests,
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
