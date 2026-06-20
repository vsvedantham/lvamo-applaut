from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.resume import ResumeResponse, UpdateExtractedContentRequest
from app.services.auth import get_current_user
from app.services.resume import get_master_resume, update_extracted_content, upload_master_resume

router = APIRouter(prefix="/resumes")


@router.post("", response_model=ResumeResponse, status_code=201)
async def upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await upload_master_resume(file, current_user, db)


@router.get("/me", response_model=ResumeResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_master_resume(current_user, db)


@router.patch("/me", response_model=ResumeResponse)
async def update_me(
    payload: UpdateExtractedContentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_extracted_content(payload, current_user, db)
