from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import CreateProfileRequest, UpdateProfileRequest


async def create_profile(
    payload: CreateProfileRequest, user: User, db: AsyncSession
) -> Profile:
    existing = await db.scalar(
        select(Profile).where(Profile.user_id == user.id, Profile.is_active == True)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Active profile already exists",
        )
    profile = Profile(
        user_id=user.id,
        display_name=payload.display_name,
        total_experience_years=payload.total_experience_years,
        target_roles=payload.target_roles,
        target_countries=payload.target_countries,
        remote_preference=payload.remote_preference.value,
        employment_types=[e.value for e in payload.employment_types],
        skills=payload.skills,
        languages=payload.languages,
        discovery_frequency_hours=payload.discovery_frequency_hours,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def get_active_profile(user: User, db: AsyncSession) -> Profile:
    profile = await db.scalar(
        select(Profile).where(Profile.user_id == user.id, Profile.is_active == True)
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active profile found",
        )
    return profile


async def update_profile(
    payload: UpdateProfileRequest, user: User, db: AsyncSession
) -> Profile:
    profile = await get_active_profile(user, db)
    data = payload.model_dump(exclude_none=True)
    if "remote_preference" in data:
        data["remote_preference"] = data["remote_preference"].value
    if "employment_types" in data:
        data["employment_types"] = [e.value for e in data["employment_types"]]
    for field, value in data.items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile
