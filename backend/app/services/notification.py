from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User


async def create_notification(
    user_id: str,
    type: str,
    title: str,
    body: str | None = None,
    metadata: dict | None = None,
    db: AsyncSession = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        metadata_=metadata or {},
    )
    db.add(n)
    await db.commit()
    await db.refresh(n)
    return n


async def list_notifications(
    user: User,
    db: AsyncSession,
    unread_only: bool = False,
    limit: int = 30,
) -> list[Notification]:
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).limit(limit)
    return list(await db.scalars(query))


async def get_unread_count(user: User, db: AsyncSession) -> int:
    return await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id,
            Notification.is_read == False,
        )
    ) or 0


async def mark_read(
    notification_id: str,
    user: User,
    db: AsyncSession,
) -> Notification | None:
    n = await db.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        return None
    n.is_read = True
    n.read_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(n)
    return n


async def mark_all_read(user: User, db: AsyncSession) -> int:
    notifications = await db.scalars(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.is_read == False,
        )
    )
    now = datetime.now(timezone.utc)
    count = 0
    for n in notifications:
        n.is_read = True
        n.read_at = now
        count += 1
    await db.commit()
    return count
