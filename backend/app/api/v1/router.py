from fastapi import APIRouter

from app.api.v1.routers import auth, health, opportunity, profile, resume, scoring

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(auth.router, tags=["auth"])
router.include_router(profile.router, tags=["profiles"])
router.include_router(resume.router, tags=["resumes"])
router.include_router(opportunity.router, tags=["opportunities"])
router.include_router(scoring.router, tags=["scoring"])
