from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.document import (
    DocumentResponse,
    GenerateDocumentsResponse,
    OpportunityDocumentsResponse,
)
from app.services.auth import get_current_user
from app.services.document import generate_documents, get_document, get_opportunity_documents

router = APIRouter()


@router.post("/opportunities/{opportunity_id}/documents", response_model=GenerateDocumentsResponse)
async def generate(
    opportunity_id: str,
    mode: Literal["template", "ai"] = Query("template"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    resume_doc, cover_doc = await generate_documents(opportunity_id, mode, current_user, db)
    return GenerateDocumentsResponse(
        tailored_resume=resume_doc,
        cover_letter=cover_doc,
        mode=mode,
    )


@router.get(
    "/opportunities/{opportunity_id}/documents",
    response_model=OpportunityDocumentsResponse,
)
async def get_for_opportunity(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tailored_resume, cover_letter = await get_opportunity_documents(
        opportunity_id, current_user, db
    )
    return OpportunityDocumentsResponse(
        opportunity_id=opportunity_id,
        tailored_resume=tailored_resume,
        cover_letter=cover_letter,
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_single(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_document(document_id, current_user, db)
