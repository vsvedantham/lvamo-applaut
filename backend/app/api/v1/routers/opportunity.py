from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.opportunity import (
    DiscoveryRunResponse,
    OpportunityDetailResponse,
    OpportunityListResponse,
    OpportunityResponse,
)
from app.services.auth import get_current_user
from app.services.opportunity import get_opportunity, list_opportunities, trigger_discovery

router = APIRouter()


@router.post("/discovery/run", response_model=DiscoveryRunResponse)
async def run_discovery(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await trigger_discovery(current_user, db)
    return DiscoveryRunResponse(
        new_jobs_found=count,
        message=f"Discovery complete. {count} new job(s) found.",
    )


@router.get("/opportunities", response_model=OpportunityListResponse)
async def list_opps(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    country_code: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_opportunities(db, page, page_size, country_code, source)
    return OpportunityListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/opportunities/{opportunity_id}", response_model=OpportunityDetailResponse)
async def get_opp(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    opp = await get_opportunity(opportunity_id, db)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return opp
