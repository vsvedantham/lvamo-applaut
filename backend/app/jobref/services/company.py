from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.jobref.models.jobref_company import JobrefCompany
from app.jobref.models.jobref_user import JobrefUser
from app.jobref.schemas.company import CompanyListItem


async def list_companies(db: AsyncSession) -> list[CompanyListItem]:
    # Only count/show a company via its currently-active employees — an
    # employee marked is_active=False (e.g. left the company, or a test
    # account) drops out of both the referrer_count and, if they were the
    # company's only registrant, the listing entirely. A company with at
    # least one other active employee still shows normally.
    stmt = (
        select(
            JobrefCompany.name,
            JobrefCompany.careers_url,
            func.count(JobrefCompany.id).label("referrer_count"),
        )
        .join(JobrefUser, JobrefUser.id == JobrefCompany.user_id)
        .where(JobrefUser.is_active.is_(True))
        .group_by(JobrefCompany.name, JobrefCompany.careers_url)
        .order_by(JobrefCompany.name)
    )
    rows = (await db.execute(stmt)).all()
    return [
        CompanyListItem(name=name, careers_url=careers_url, referrer_count=referrer_count)
        for name, careers_url, referrer_count in rows
    ]
