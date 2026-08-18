from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.jobref.schemas.auth import LinkedInPrefillResponse
from app.jobref.services.linkedin import build_authorize_url, decode_registration_token, handle_callback

router = APIRouter(prefix="/auth/linkedin")


@router.get("/authorize")
async def authorize():
    """Registration's single entry point — a plain browser navigation
    (not an XHR) straight to LinkedIn's consent screen, so the Client
    Secret never has to reach the frontend."""
    return RedirectResponse(build_authorize_url())


@router.get("/callback")
async def callback(code: str | None = None, state: str = "", error: str | None = None, db: AsyncSession = Depends(get_db)):
    frontend = settings.frontend_base_url.rstrip("/")
    if error or not code:
        # User denied consent, or LinkedIn returned an error — send them
        # back to the register page to try again.
        return RedirectResponse(f"{frontend}/jobref/register?linkedin=error")

    result = await handle_callback(code, state, db)
    if result.status == "existing_account":
        return RedirectResponse(f"{frontend}/jobref/login?linkedin=existing")
    return RedirectResponse(f"{frontend}/jobref/register/complete?token={result.registration_token}")


@router.get("/prefill", response_model=LinkedInPrefillResponse)
async def prefill(token: str = Query(...)):
    """Lets the registration-details page show exactly what was pulled
    from LinkedIn before the user fills in the rest — the transparency
    step requested alongside this flow."""
    claims = decode_registration_token(token)
    return LinkedInPrefillResponse(
        first_name=claims.first_name,
        last_name=claims.last_name,
        email=claims.email,
        email_verified=claims.email_verified,
    )
