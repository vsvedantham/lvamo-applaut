from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.opportunity import Opportunity
from app.models.user import User
from app.services.profile import get_active_profile
from app.discovery.engine import run_discovery_for_profile


async def trigger_discovery(user: User, db: AsyncSession) -> int:
    profile = await get_active_profile(user, db)
    count = await run_discovery_for_profile(profile, db)
    from app.services.audit import log_action
    await log_action(
        action="discovery.run",
        db=db,
        user_id=str(user.id),
        entity_type="profile",
        entity_id=str(profile.id),
        after_state={"new_jobs_found": count},
    )
    await db.commit()
    return count


async def list_opportunities(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    country_code: str | None = None,
    source: str | None = None,
) -> tuple[list[Opportunity], int]:
    query = select(Opportunity).where(Opportunity.is_active == True)

    if country_code:
        query = query.where(Opportunity.country_code == country_code)
    if source:
        query = query.where(Opportunity.source == source)

    total = await db.scalar(
        select(func.count()).select_from(query.subquery())
    )

    items = await db.scalars(
        query.order_by(Opportunity.posted_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(items), total or 0


async def get_opportunity(opportunity_id: str, db: AsyncSession) -> Opportunity | None:
    return await db.get(Opportunity, opportunity_id)
