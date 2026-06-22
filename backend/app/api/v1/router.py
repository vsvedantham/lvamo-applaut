from fastapi import APIRouter

from app.api.v1.routers import applications, auth, documents, health, opportunity, profile, resume, scoring, stats

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(auth.router, tags=["auth"])
router.include_router(profile.router, tags=["profiles"])
router.include_router(resume.router, tags=["resumes"])
router.include_router(opportunity.router, tags=["opportunities"])
router.include_router(scoring.router, tags=["scoring"])
router.include_router(documents.router, tags=["documents"])
router.include_router(applications.router, tags=["applications"])
router.include_router(stats.router, tags=["stats"])
