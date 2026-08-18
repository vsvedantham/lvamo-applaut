from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.jobref.models.jobref_company import JobrefCompany
from app.jobref.schemas.company import CompanyListItem


async def list_companies(db: AsyncSession) -> list[CompanyListItem]:
    stmt = (
        select(
            JobrefCompany.name,
            JobrefCompany.careers_url,
            func.count(JobrefCompany.id).label("referrer_count"),
        )
        .group_by(JobrefCompany.name, JobrefCompany.careers_url)
        .order_by(JobrefCompany.name)
    )
    rows = (await db.execute(stmt)).all()
    return [
        CompanyListItem(name=name, careers_url=careers_url, referrer_count=referrer_count)
        for name, careers_url, referrer_count in rows
    ]
