from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.profile import CreateProfileRequest, ProfileResponse, UpdateProfileRequest
from app.services.auth import get_current_user
from app.services.profile import create_profile, get_active_profile, update_profile

router = APIRouter(prefix="/profiles")


@router.post("", response_model=ProfileResponse, status_code=201)
async def create(
    payload: CreateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_profile(payload, current_user, db)


@router.get("/me", response_model=ProfileResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_active_profile(current_user, db)


@router.patch("/me", response_model=ProfileResponse)
async def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_profile(payload, current_user, db)
