from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.application import Application
from app.models.generated_document import GeneratedDocument
from app.models.opportunity import Opportunity
from app.models.score import Score
from app.models.user import User
from app.scoring.rule_based import GOOD_THRESHOLD, NEAR_MISS_THRESHOLD
from app.services.auth import get_current_user

router = APIRouter(prefix="/stats")


class ApplicationStats(BaseModel):
    total: int
    pending_review: int
    submitted: int
    interviewing: int
    offered: int


class DashboardStats(BaseModel):
    opportunities_found: int
    good_matches: int
    near_misses: int
    documents_generated: int
    applications: ApplicationStats


@router.get("", response_model=DashboardStats)
async def get_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user.id

    opportunities_found = await db.scalar(
        select(func.count(Opportunity.id)).where(Opportunity.is_active == True)
    ) or 0

    good_matches = await db.scalar(
        select(func.count(Score.id)).where(
            Score.user_id == uid,
            Score.total_score >= GOOD_THRESHOLD,
        )
    ) or 0

    near_misses = await db.scalar(
        select(func.count(Score.id)).where(
            Score.user_id == uid,
            Score.total_score >= NEAR_MISS_THRESHOLD,
            Score.total_score < GOOD_THRESHOLD,
        )
    ) or 0

    documents_generated = await db.scalar(
        select(func.count(GeneratedDocument.id)).where(
            GeneratedDocument.user_id == uid,
            GeneratedDocument.is_current == True,
        )
    ) or 0

    app_total = await db.scalar(
        select(func.count(Application.id)).where(Application.user_id == uid)
    ) or 0

    def _count_status(status: str):
        return select(func.count(Application.id)).where(
            Application.user_id == uid,
            Application.status == status,
        )

    app_pending = await db.scalar(_count_status("pending_review")) or 0
    app_submitted = await db.scalar(_count_status("submitted")) or 0
    app_interviewing = await db.scalar(_count_status("interviewing")) or 0
    app_offered = await db.scalar(_count_status("offered")) or 0

    return DashboardStats(
        opportunities_found=opportunities_found,
        good_matches=good_matches,
        near_misses=near_misses,
        documents_generated=documents_generated,
        applications=ApplicationStats(
            total=app_total,
            pending_review=app_pending,
            submitted=app_submitted,
            interviewing=app_interviewing,
            offered=app_offered,
        ),
    )
