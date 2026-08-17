from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.jobref.models.jobref_user import JobrefUser
from app.jobref.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.jobref.schemas.user import JobrefUserResponse
from app.jobref.services.auth import get_current_user, login, register

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register_user(
    payload: RegisterRequest, db: AsyncSession = Depends(get_db)
):
    # Registration is open (no invite gate) for Jobref, unlike Applaut.
    _, token = await register(payload, db)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login_user(
    payload: LoginRequest, db: AsyncSession = Depends(get_db)
):
    _, token = await login(payload, db)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=JobrefUserResponse)
async def me(current_user: JobrefUser = Depends(get_current_user)):
    return current_user
