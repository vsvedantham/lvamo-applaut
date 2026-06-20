import uuid

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.ai import extract_resume_data
from app.core.extract_text import extract_text
from app.core.storage import delete_file, upload_file
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import UpdateExtractedContentRequest

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


async def upload_master_resume(file: UploadFile, user: User, db: AsyncSession) -> Resume:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF and DOCX files are supported",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size must not exceed 5 MB",
        )

    # Extract text and run AI extraction
    text = extract_text(data, file.content_type)
    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract text from the uploaded file",
        )

    try:
        extracted = extract_resume_data(text)
    except Exception:
        extracted = {"skills": [], "languages": [], "experience": [], "education": [], "certifications": []}

    # Deactivate previous master resume
    existing = await db.scalar(
        select(Resume).where(Resume.user_id == user.id, Resume.is_master == True)
    )

    r2_key = f"resumes/{user.id}/{uuid.uuid4()}/{file.filename}"

    if settings.r2_bucket_name:
        upload_file(r2_key, data, file.content_type)
    else:
        r2_key = f"local/{r2_key}"

    if existing:
        existing.is_master = False

    resume = Resume(
        user_id=user.id,
        file_name=file.filename or "resume",
        r2_key=r2_key,
        content_extracted=extracted,
        is_master=True,
        version=(existing.version + 1) if existing else 1,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


async def get_master_resume(user: User, db: AsyncSession) -> Resume:
    resume = await db.scalar(
        select(Resume).where(Resume.user_id == user.id, Resume.is_master == True)
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No master resume found",
        )
    return resume


async def update_extracted_content(
    payload: UpdateExtractedContentRequest, user: User, db: AsyncSession
) -> Resume:
    resume = await get_master_resume(user, db)
    current = dict(resume.content_extracted or {})
    updates = payload.model_dump(exclude_none=True)
    for key, val in updates.items():
        if isinstance(val, list):
            current[key] = [
                v.model_dump() if hasattr(v, "model_dump") else v for v in val
            ]
        else:
            current[key] = val
    resume.content_extracted = current
    await db.commit()
    await db.refresh(resume)
    return resume
