from fastapi import APIRouter

from app.jobref.api.v1.routers import auth, companies, health, linkedin, referral_requests

router = APIRouter()
router.include_router(health.router, tags=["jobref-health"])
router.include_router(auth.router, tags=["jobref-auth"])
router.include_router(linkedin.router, tags=["jobref-auth"])
router.include_router(companies.router, tags=["jobref-companies"])
router.include_router(referral_requests.router, tags=["jobref-referral-requests"])
