"""LinkedIn OAuth (Sign In with LinkedIn using OpenID Connect) — the sole
identity source for Jobref registration. See PROGRESS_JOBREF.md for the
overall flow. Nothing here is reused by login (which stays email/password)
or by any other vertical.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import create_access_token
from app.jobref.models.jobref_user import JobrefUser

AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
SCOPE = "openid profile email"

STATE_PURPOSE = "jobref_linkedin_state"
STATE_EXPIRE_MINUTES = 5
REGISTRATION_PURPOSE = "jobref_registration"
REGISTRATION_EXPIRE_MINUTES = 15


def build_authorize_url() -> str:
    state = create_access_token(
        subject="linkedin-oauth",
        extra_claims={"purpose": STATE_PURPOSE},
        expires_minutes=STATE_EXPIRE_MINUTES,
    )
    params = {
        "response_type": "code",
        "client_id": settings.jobref_linkedin_client_id,
        "redirect_uri": settings.jobref_linkedin_redirect_uri,
        "scope": SCOPE,
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def _decode_purpose(token: str, expected_purpose: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    if payload.get("purpose") != expected_purpose:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    return payload


def verify_state(state: str) -> None:
    _decode_purpose(state, STATE_PURPOSE)


@dataclass
class RegistrationTokenClaims:
    linkedin_id: str
    email: str
    email_verified: bool
    first_name: str
    last_name: str


def decode_registration_token(token: str) -> RegistrationTokenClaims:
    payload = _decode_purpose(token, REGISTRATION_PURPOSE)
    return RegistrationTokenClaims(
        linkedin_id=payload["sub"],
        email=payload["email"],
        email_verified=payload["email_verified"],
        first_name=payload["first_name"],
        last_name=payload["last_name"],
    )


async def _exchange_code(code: str) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.jobref_linkedin_redirect_uri,
                "client_id": settings.jobref_linkedin_client_id,
                "client_secret": settings.jobref_linkedin_client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LinkedIn sign-in failed — could not exchange authorization code",
        )
    access_token = resp.json().get("access_token")
    if not access_token:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LinkedIn sign-in failed")
    return access_token


async def _fetch_userinfo(access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LinkedIn sign-in failed — could not fetch profile",
        )
    return resp.json()


@dataclass
class CallbackResult:
    status: Literal["existing_account", "new"]
    registration_token: str | None = None


async def handle_callback(code: str, state: str, db: AsyncSession) -> CallbackResult:
    verify_state(state)
    access_token = await _exchange_code(code)
    info = await _fetch_userinfo(access_token)

    linkedin_id = info.get("sub")
    email = info.get("email")
    if not linkedin_id or not email:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LinkedIn did not return the required profile fields",
        )

    # Dedup on LinkedIn's stable member id first (the durable identity), and
    # on email as defense in depth — either match means this person already
    # has a Jobref account, so we never create a second one.
    existing = await db.scalar(
        select(JobrefUser).where(
            (JobrefUser.linkedin_id == linkedin_id) | (JobrefUser.email == email)
        )
    )
    if existing:
        return CallbackResult(status="existing_account")

    registration_token = create_access_token(
        subject=linkedin_id,
        extra_claims={
            "purpose": REGISTRATION_PURPOSE,
            "email": email,
            "email_verified": bool(info.get("email_verified", False)),
            "first_name": info.get("given_name", ""),
            "last_name": info.get("family_name", ""),
        },
        expires_minutes=REGISTRATION_EXPIRE_MINUTES,
    )
    return CallbackResult(status="new", registration_token=registration_token)
