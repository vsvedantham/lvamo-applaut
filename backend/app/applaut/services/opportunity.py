from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.applaut.models.opportunity import Opportunity
from app.applaut.models.score import Score
from app.applaut.models.user import User
from app.applaut.services.profile import get_active_profile
from app.applaut.discovery.engine import run_discovery_for_profile


async def trigger_discovery(user: User, db: AsyncSession) -> dict:
    profile = await get_active_profile(user, db)
    count = await run_discovery_for_profile(profile, db)
    from app.applaut.services.audit import log_action
    await log_action(
        action="discovery.run",
        db=db,
        user_id=str(user.id),
        entity_type="profile",
        entity_id=str(profile.id),
        after_state={"new_jobs_found": count},
    )
    await db.commit()

    from app.applaut.services.scoring import run_scoring
    scoring_result = await run_scoring(user, db, "rule_based")

    return {
        "new_jobs_found": count,
        "scored": scoring_result["scored"],
        "good_matches": scoring_result["good_matches"],
        "near_misses": scoring_result["near_misses"],
    }


async def list_opportunities_with_scores(
    user: User,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    country_code: str | None = None,
    source: str | None = None,
    match: str = "all",
) -> tuple[list[tuple[Opportunity, Score | None]], int, int, int]:
    profile = await get_active_profile(user, db)
    good_threshold = profile.good_threshold
    near_miss_threshold = good_threshold - 15

    query = (
        select(Opportunity, Score)
        .outerjoin(
            Score,
            (Score.opportunity_id == Opportunity.id) & (Score.profile_id == profile.id),
        )
        .where(Opportunity.is_active == True)
    )

    if country_code:
        query = query.where(Opportunity.country_code == country_code)
    if source:
        query = query.where(Opportunity.source == source)
    if match == "good":
        query = query.where(Score.total_score >= good_threshold)
    elif match == "near_miss":
        query = query.where(Score.total_score >= near_miss_threshold, Score.total_score < good_threshold)
    elif match == "below":
        query = query.where(Score.total_score < near_miss_threshold)
    elif match == "unscored":
        query = query.where(Score.id.is_(None))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))

    query = query.order_by(Score.total_score.desc().nulls_last(), Opportunity.posted_at.desc())
    rows = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    return list(rows.all()), total or 0, good_threshold, near_miss_threshold


async def get_opportunity(opportunity_id: str, db: AsyncSession) -> Opportunity | None:
    return await db.get(Opportunity, opportunity_id)
