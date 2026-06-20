import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.storage import upload_file
from app.generation.template import generate_cover_letter, generate_resume
from app.models.generated_document import GeneratedDocument
from app.models.opportunity import Opportunity
from app.models.resume import Resume
from app.models.user import User
from app.services.profile import get_active_profile

logger = logging.getLogger(__name__)

ALLOWED_MODES = {"template", "ai"}


async def _get_opportunity(opportunity_id: str, db: AsyncSession) -> Opportunity:
    opp = await db.get(Opportunity, opportunity_id)
    if not opp or not opp.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return opp


async def _get_master_resume(user: User, db: AsyncSession) -> Resume:
    resume = await db.scalar(
        select(Resume).where(Resume.user_id == user.id, Resume.is_master == True)
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Upload a master resume before generating documents",
        )
    return resume


def _store_in_r2(content: str, key: str) -> str | None:
    if not settings.r2_bucket_name:
        return None
    try:
        upload_file(key, content.encode("utf-8"), "text/markdown")
        return key
    except Exception as exc:
        logger.warning("R2 upload failed for %s: %s", key, exc)
        return None


async def generate_documents(
    opportunity_id: str,
    mode: str,
    user: User,
    db: AsyncSession,
) -> tuple[GeneratedDocument, GeneratedDocument]:
    if mode not in ALLOWED_MODES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"mode must be one of {ALLOWED_MODES}",
        )

    profile = await get_active_profile(user, db)
    opp = await _get_opportunity(opportunity_id, db)
    resume = await _get_master_resume(user, db)

    if mode == "ai":
        from app.generation.ai_generator import generate_cover_letter_ai, generate_resume_ai
        resume_content = await generate_resume_ai(opp, profile, resume)
        cover_content = await generate_cover_letter_ai(opp, profile, resume)
        ai_model = "gpt-4o-mini"
    else:
        resume_content = generate_resume(opp, profile, resume)
        cover_content = generate_cover_letter(opp, profile, resume)
        ai_model = None

    # Mark previous docs for this opportunity as no longer current
    prev_docs = await db.scalars(
        select(GeneratedDocument).where(
            GeneratedDocument.opportunity_id == opp.id,
            GeneratedDocument.user_id == user.id,
            GeneratedDocument.is_current == True,
        )
    )
    for doc in prev_docs:
        doc.is_current = False

    run_id = uuid.uuid4()
    resume_key = f"documents/{user.id}/{opp.id}/{run_id}/tailored_resume.md"
    cover_key = f"documents/{user.id}/{opp.id}/{run_id}/cover_letter.md"

    resume_doc = GeneratedDocument(
        user_id=user.id,
        profile_id=profile.id,
        opportunity_id=opp.id,
        source_resume_id=resume.id,
        document_type="tailored_resume",
        generation_mode=mode,
        content=resume_content,
        r2_key=_store_in_r2(resume_content, resume_key),
        ai_model=ai_model,
        is_current=True,
    )
    cover_doc = GeneratedDocument(
        user_id=user.id,
        profile_id=profile.id,
        opportunity_id=opp.id,
        source_resume_id=resume.id,
        document_type="cover_letter",
        generation_mode=mode,
        content=cover_content,
        r2_key=_store_in_r2(cover_content, cover_key),
        ai_model=ai_model,
        is_current=True,
    )

    db.add(resume_doc)
    db.add(cover_doc)
    await db.commit()
    await db.refresh(resume_doc)
    await db.refresh(cover_doc)
    return resume_doc, cover_doc


async def get_opportunity_documents(
    opportunity_id: str,
    user: User,
    db: AsyncSession,
) -> tuple[GeneratedDocument | None, GeneratedDocument | None]:
    docs = await db.scalars(
        select(GeneratedDocument).where(
            GeneratedDocument.opportunity_id == opportunity_id,
            GeneratedDocument.user_id == user.id,
            GeneratedDocument.is_current == True,
        )
    )
    tailored_resume = None
    cover_letter = None
    for doc in docs:
        if doc.document_type == "tailored_resume":
            tailored_resume = doc
        elif doc.document_type == "cover_letter":
            cover_letter = doc
    return tailored_resume, cover_letter


async def get_document(
    document_id: str,
    user: User,
    db: AsyncSession,
) -> GeneratedDocument:
    doc = await db.get(GeneratedDocument, document_id)
    if not doc or doc.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc
