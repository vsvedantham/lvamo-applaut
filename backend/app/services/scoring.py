import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.opportunity import Opportunity
from app.models.profile import Profile
from app.models.resume import Resume
from app.models.score import Score
from app.models.user import User
from app.scoring.rule_based import GOOD_THRESHOLD, NEAR_MISS_THRESHOLD, score_opportunity
from app.services.profile import get_active_profile

logger = logging.getLogger(__name__)

USER_DECISIONS = {"keep", "dismiss", "keep_with_keywords"}


async def _get_resume(user: User, db: AsyncSession) -> Resume | None:
    return await db.scalar(
        select(Resume).where(Resume.user_id == user.id, Resume.is_master == True)
    )


async def _get_unscored_opportunities(profile: Profile, db: AsyncSession) -> list[Opportunity]:
    scored_ids = await db.scalars(
        select(Score.opportunity_id).where(Score.profile_id == profile.id)
    )
    scored_set = set(scored_ids)
    opps = await db.scalars(select(Opportunity).where(Opportunity.is_active == True))
    return [o for o in opps if o.id not in scored_set]


async def run_scoring(
    user: User,
    db: AsyncSession,
    mode: str = "rule_based",
) -> dict:
    if mode not in ("rule_based", "ai"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="mode must be rule_based or ai")

    profile = await get_active_profile(user, db)
    resume = await _get_resume(user, db)
    opportunities = await _get_unscored_opportunities(profile, db)

    if not opportunities:
        return {"scored": 0, "good_matches": 0, "near_misses": 0, "below_threshold": 0, "mode": mode}

    good = near_miss = below = 0

    for opp in opportunities:
        try:
            if mode == "ai":
                from app.scoring.ai_scorer import score_opportunity_ai
                result = await score_opportunity_ai(opp, profile, resume)
                ai_model = "gpt-4o-mini"
            else:
                result = score_opportunity(opp, profile, resume)
                ai_model = None

            score = Score(
                opportunity_id=opp.id,
                profile_id=profile.id,
                user_id=user.id,
                total_score=result.total,
                skills_score=result.dimensions["skills"].score,
                experience_score=result.dimensions["experience"].score,
                location_score=result.dimensions["location"].score,
                employment_type_score=result.dimensions["employment_type"].score,
                explanation=result.to_explanation_dict(),
                ai_model=ai_model,
                scoring_mode=mode,
                near_miss_keywords=result.near_miss_keywords if result.near_miss_keywords else None,
                user_decision="pending_review" if result.is_near_miss else None,
            )
            db.add(score)

            if result.is_good_match:
                good += 1
            elif result.is_near_miss:
                near_miss += 1
            else:
                below += 1

        except Exception as exc:
            logger.warning("Scoring failed for opportunity %s: %s", opp.id, exc)

    await db.commit()
    return {"scored": good + near_miss + below, "good_matches": good, "near_misses": near_miss, "below_threshold": below, "mode": mode}


async def list_scores(
    user: User,
    db: AsyncSession,
    filter_type: str = "good",
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Score], int]:
    query = select(Score).where(Score.user_id == user.id)

    if filter_type == "good":
        query = query.where(Score.total_score >= GOOD_THRESHOLD)
    elif filter_type == "near_miss":
        query = query.where(
            Score.total_score >= NEAR_MISS_THRESHOLD,
            Score.total_score < GOOD_THRESHOLD,
        )

    from sqlalchemy import func
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    items = await db.scalars(
        query.order_by(Score.total_score.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(items), total or 0


async def decide_near_miss(
    score_id: str,
    action: str,
    keywords_to_add: list[str],
    user: User,
    db: AsyncSession,
) -> Score:
    if action not in USER_DECISIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"action must be one of {USER_DECISIONS}")

    score = await db.get(Score, score_id)
    if not score or score.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Score not found")
    if score.total_score >= GOOD_THRESHOLD:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only near-miss scores require a decision")

    score.user_decision = action

    if action == "keep_with_keywords" and keywords_to_add:
        profile = await get_active_profile(user, db)
        existing = set(s.lower() for s in (profile.skills or []))
        new_skills = [kw for kw in keywords_to_add if kw.lower() not in existing]
        if new_skills:
            profile.skills = list(profile.skills or []) + new_skills

        # Re-score immediately with the updated profile
        resume = await _get_resume(user, db)
        opp = await db.get(Opportunity, score.opportunity_id)
        if opp:
            try:
                result = score_opportunity(opp, profile, resume)
                score.total_score = result.total
                score.skills_score = result.dimensions["skills"].score
                score.experience_score = result.dimensions["experience"].score
                score.location_score = result.dimensions["location"].score
                score.employment_type_score = result.dimensions["employment_type"].score
                score.explanation = result.to_explanation_dict()
                score.near_miss_keywords = result.near_miss_keywords if result.near_miss_keywords else None
                # Crossed the threshold → move it to Good Matches by clearing the decision
                if result.is_good_match:
                    score.user_decision = None
            except Exception as exc:
                logger.warning("Re-scoring failed for score %s: %s", score_id, exc)

    if action == "dismiss":
        opp = await db.get(Opportunity, score.opportunity_id)
        if opp:
            opp.is_active = False

    await db.commit()
    await db.refresh(score)
    return score
