from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.jobref.models.jobref_user import JobrefUser
from app.jobref.schemas.company import CompanyListItem
from app.jobref.services.auth import get_current_user
from app.jobref.services.company import list_companies

router = APIRouter(prefix="/companies")


@router.get("", response_model=list[CompanyListItem])
async def companies(
    # Any authenticated Jobref user can read this — it's a directory of
    # non-sensitive data (company name + a careers page URL an employee
    # chose to share), not restricted to job seekers at the API level even
    # though the dashboard only surfaces it to them for now.
    current_user: JobrefUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_companies(db)
