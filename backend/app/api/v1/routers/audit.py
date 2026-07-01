from typing import Optional
import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.services.audit import list_audit_logs

router = APIRouter(prefix="/audit")


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    action: str
    entity_type: Optional[str]
    entity_id: Optional[uuid.UUID]
    after_state: Optional[dict]
    created_at: str

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=AuditLogListResponse)
async def get_audit_logs(
    entity_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_audit_logs(
        str(user.id), db, entity_type=entity_type, page=page, page_size=page_size
    )
    return AuditLogListResponse(
        items=[
            AuditLogResponse(
                id=item.id,
                action=item.action,
                entity_type=item.entity_type,
                entity_id=item.entity_id,
                after_state=item.after_state,
                created_at=item.created_at.isoformat(),
            )
            for item in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )
