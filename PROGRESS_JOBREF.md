# Jobref — Progress

> Vertical-specific progress for Jobref. Platform-level infra/architecture
> lives in [`PROGRESS.md`](PROGRESS.md) — read that first if you haven't.

---

## Status: Login / registration built and verified locally, not yet deployed

Jobref is LVAMO's second vertical — a job-referral platform connecting job
seekers with employees willing to refer them at their company. As of Aug
2026, auth (register/login/me) is fully built end-to-end (backend + DB +
frontend) and verified locally; nothing beyond auth exists yet (no referral
matching, no messaging, no notifications).

## What exists today

- **Backend** (`backend/app/jobref/`), mounted at `/api/v1/jobref/*`:
  - `models/`: `jobref_users` (shared fields incl. `domain` — free-text
    professional field/industry, same concept for both employee and job
    seeker per the resolved open question), `jobref_employee_profiles`,
    `jobref_seeker_profiles` (both 1:1 on `user_id`, `ON DELETE CASCADE`).
  - `schemas/auth.py`: `RegisterRequest` with conditional `employee` /
    `seeker` sub-payloads gated by `user_type`; Pydantic validators enforce
    the conditional-required fields (`refer_frequency`/`refer_count` only
    when `can_refer=true`; `notice_join_date` only when
    `current_job_status=serving_notice`) and a loose German phone number
    format check.
  - `services/auth.py`: register/login/`get_current_user`, reusing shared
    `app/core/security.py` (hash/verify password) and `app/db/session.py`.
  - **Vertical-scoped JWTs**: `core/security.py`'s `create_access_token` now
    accepts optional `extra_claims`; Jobref stamps `{"vertical": "jobref"}`
    on every token it issues, and its `get_current_user` rejects any token
    missing that claim — so a token minted for Applaut (or a future
    vertical) can never be replayed against Jobref's endpoints, even though
    JWT signing secret/algorithm are shared infra. Applaut's own tokens are
    unchanged (no claim added, same as before).
  - Router: `api/v1/routers/{health,auth}.py` → `/register`, `/login`,
    `/me`. Registration is **open** (no invite gate, unlike Applaut).
  - Migration `0007_jobref_tables.py` — raw-SQL, matches repo convention
    (see `0006_application_settings.py`), incl. DB-level CHECK constraints
    mirroring the Pydantic conditional-field rules as defense in depth.
- **Frontend** (`frontend/src/jobref/`), routes under `/jobref/*`:
  - `api/client.ts` — own axios instance, own token key
    (`jobref_access_token`, never collides with Applaut's
    `applaut_access_token`).
  - `context/AuthContext.tsx` (`JobrefAuthProvider` / `useJobrefAuth`),
    `components/ProtectedRoute.tsx` (`JobrefProtectedRoute`) — independent
    of Applaut's equivalents, same shape.
  - `pages/Jobref.tsx` — updated from the old "coming soon" placeholder to
    a real landing page with "Get started" / "Sign in" CTAs.
  - `pages/Login.tsx`, `pages/Register.tsx` (full conditional form: shared
    fields, employee/job-seeker type selector, conditional sub-fields),
    `pages/Dashboard.tsx` (minimal post-auth profile summary + sign out).
  - Wired into `App.tsx`: `JobrefAuthProvider` wraps the router alongside
    Applaut's `AuthProvider` (siblings, fully independent state).
- **Verified locally**: backend boots clean, migration applied, full
  register→login→`/me` flow tested via curl for both user types plus
  validation edge cases (bad German phone, missing conditional fields,
  cross-vertical token rejection). Frontend: `tsc --noEmit` and
  `npm run build` clean; full Playwright pass through
  hub→landing→register (both types)→dashboard→logout→login→dashboard, plus
  an Applaut-page regression check — zero console errors.

## Resolved decisions (previously open)

- **`domain` field**: same free-text professional-field/industry concept
  for both employee and job-seeker registration — confirmed.
- **Registration gate**: open, no invite-gate.
- **CV Google-Drive-link**: required for job seekers.
- **`company_careers_url`**: made required for employees (core to the
  referral value prop — without it there's no way to point a job seeker at
  open roles).

## Next steps

- **⚠️ Committed locally only, NOT pushed to `origin`** — commit `3d5fd42`
  on `main`, sitting ahead of the remote. User explicitly chose to hold off
  on deploying today (asked "should I deploy now?" → "Hold off"). Next
  session: confirm with the user before pushing/deploying — don't assume
  yesterday's local commit should go out automatically.
- Deploy (once approved): `git push`, then backend migration + redeploy on
  `lvamo-backend` (runs migration `0007`), frontend redeploy via Cloudflare
  Pages (auto, on push), then verify both in production (same pattern as
  every other deploy this session — health check + real register/login
  against production).
- Beyond auth: the actual referral-matching product logic (how a job
  seeker gets connected to a referring employee at the same company/domain)
  is not yet designed — next major feature after this auth foundation ships.

---

### Session update — auth built, deploy held (committed `3d5fd42`, local only)

Session end state, Aug 2026: full login/registration feature built and
verified locally (see "What exists today" above for the complete
breakdown). Committed to local `main` but the user chose not to push/deploy
today — everything above this line describes code that exists on disk and
in the local git history, not (yet) in production.
