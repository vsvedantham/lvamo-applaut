import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: uuid.UUID
    opportunity_id: uuid.UUID
    document_type: str
    generation_mode: str
    content: str
    ai_model: Optional[str]
    is_current: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OpportunityDocumentsResponse(BaseModel):
    opportunity_id: uuid.UUID
    tailored_resume: Optional[DocumentResponse] = None
    cover_letter: Optional[DocumentResponse] = None


class GenerateDocumentsResponse(BaseModel):
    tailored_resume: DocumentResponse
    cover_letter: DocumentResponse
    mode: str
