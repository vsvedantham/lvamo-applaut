from fastapi import APIRouter

from app.jobref.api.v1.routers import auth, health, linkedin

router = APIRouter()
router.include_router(health.router, tags=["jobref-health"])
router.include_router(auth.router, tags=["jobref-auth"])
router.include_router(linkedin.router, tags=["jobref-auth"])
