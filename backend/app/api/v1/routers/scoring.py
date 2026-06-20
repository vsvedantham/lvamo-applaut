from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.score import DecideNearMissRequest, ScoreListResponse, ScoreResponse, ScoringRunResponse
from app.services.auth import get_current_user
from app.services.scoring import decide_near_miss, list_scores, run_scoring

router = APIRouter()


@router.post("/scoring/run", response_model=ScoringRunResponse)
async def run(
    mode: Literal["rule_based", "ai"] = Query("rule_based"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await run_scoring(current_user, db, mode)


@router.get("/scores", response_model=ScoreListResponse)
async def get_scores(
    filter_type: Literal["good", "near_miss", "all"] = Query("good"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_scores(current_user, db, filter_type, page, page_size)
    return ScoreListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/scores/{score_id}/decide", response_model=ScoreResponse)
async def decide(
    score_id: str,
    payload: DecideNearMissRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await decide_near_miss(score_id, payload.action, payload.keywords_to_add, current_user, db)
