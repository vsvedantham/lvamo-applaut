from sqlalchemy.ext.asyncio import AsyncSession

from app.jobref.models.jobref_referral_request import JobrefReferralRequest
from app.jobref.models.jobref_user import JobrefUser
from app.jobref.schemas.referral_request import ReferralRequestCreate


async def create_referral_request(
    payload: ReferralRequestCreate, seeker: JobrefUser, db: AsyncSession
) -> JobrefReferralRequest:
    request = JobrefReferralRequest(seeker_user_id=seeker.id, **payload.model_dump())
    db.add(request)
    await db.commit()
    await db.refresh(request)
    return request
