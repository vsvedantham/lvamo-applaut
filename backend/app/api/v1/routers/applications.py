import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.application import (
    ApplicationListResponse,
    ApplicationResponse,
    CreateApplicationRequest,
    UpdateApplicationRequest,
)
from app.services import application as svc

router = APIRouter(prefix="/applications")


@router.post("", response_model=ApplicationResponse, status_code=201)
async def create_application(
    body: CreateApplicationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.create_application(
        opportunity_id=str(body.opportunity_id),
        score_id=str(body.score_id) if body.score_id else None,
        notes=body.notes,
        user=user,
        db=db,
    )


@router.get("", response_model=ApplicationListResponse)
async def list_applications(
    status: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await svc.list_applications(user=user, db=db, status_filter=status)
    return ApplicationListResponse(items=items, total=len(items))


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_application(str(application_id), user, db)


@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: uuid.UUID,
    body: UpdateApplicationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.update_application(
        str(application_id),
        new_status=body.status,
        notes=body.notes,
        user=user,
        db=db,
    )


@router.delete("/{application_id}", status_code=204)
async def delete_application(
    application_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await svc.delete_application(str(application_id), user, db)
