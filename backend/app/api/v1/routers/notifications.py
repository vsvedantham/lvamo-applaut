import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.services.notification import (
    get_unread_count,
    list_notifications,
    mark_all_read,
    mark_read,
)

router = APIRouter(prefix="/notifications")


class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    body: Optional[str]
    is_read: bool
    created_at: str
    metadata: dict = {}

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int


def _to_response(n) -> NotificationResponse:
    return NotificationResponse(
        id=n.id,
        type=n.type,
        title=n.title,
        body=n.body,
        is_read=n.is_read,
        created_at=n.created_at.isoformat(),
        metadata=n.metadata_ or {},
    )


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await list_notifications(user, db, limit=30)
    unread = await get_unread_count(user, db)
    return NotificationListResponse(
        items=[_to_response(n) for n in items],
        unread_count=unread,
    )


@router.get("/unread-count")
async def unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {"unread_count": await get_unread_count(user, db)}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    n = await mark_read(str(notification_id), user, db)
    if not n:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return _to_response(n)


@router.post("/read-all")
async def mark_all_notifications_read(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await mark_all_read(user, db)
    return {"marked_read": count}
