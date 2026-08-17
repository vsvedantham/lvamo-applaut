from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.applaut.models.application_setting import ApplicationSetting
from app.applaut.models.user import User
from app.applaut.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.applaut.schemas.user import UserResponse
from app.applaut.services.auth import get_current_user, login, register

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register_user(
    payload: RegisterRequest, db: AsyncSession = Depends(get_db)
):
    setting = await db.scalar(
        select(ApplicationSetting).where(ApplicationSetting.setting_name == "allow_new_registrations")
    )
    if not setting or setting.value != "1":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently closed. Please check back soon.",
        )
    _, token = await register(payload, db)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login_user(
    payload: LoginRequest, db: AsyncSession = Depends(get_db)
):
    _, token = await login(payload, db)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
