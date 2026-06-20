from fastapi import APIRouter

from app.api.v1.routers import auth, health

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(auth.router, tags=["auth"])
