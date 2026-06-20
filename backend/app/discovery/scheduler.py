import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.discovery.engine import run_discovery_for_profile
from app.models.profile import Profile

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _run_all_active_profiles() -> None:
    async with AsyncSessionLocal() as db:
        profiles = await db.scalars(
            select(Profile).where(
                Profile.is_active == True,
                Profile.discovery_enabled == True,
            )
        )
        for profile in profiles:
            try:
                count = await run_discovery_for_profile(profile, db)
                logger.info("Discovery: %d new jobs for profile %s", count, profile.id)
            except Exception as exc:
                logger.error("Discovery failed for profile %s: %s", profile.id, exc)


def start_scheduler() -> None:
    scheduler.add_job(
        _run_all_active_profiles,
        trigger="interval",
        hours=6,
        id="discovery",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Discovery scheduler started (runs every 6h)")


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
