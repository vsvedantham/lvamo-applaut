from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth import get_current_user, login, register

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register_user(
    payload: RegisterRequest, db: AsyncSession = Depends(get_db)
):
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
