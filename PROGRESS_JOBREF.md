# Jobref — Progress

> Vertical-specific progress for Jobref. Platform-level infra/architecture
> lives in [`PROGRESS.md`](PROGRESS.md) — read that first if you haven't.

---

## 🎯 NEXT SESSION PRIMARY TASK

**Blocked on the user creating the LinkedIn Developer App.** Registration now
requires LinkedIn OAuth end-to-end (code complete, verified locally with
mocked LinkedIn responses — see "LinkedIn OAuth registration" below) but
can't be tested against the real LinkedIn API until real credentials exist.

1. User creates the LinkedIn app (steps given in chat this session — Company
   Page → app → request "Sign In with LinkedIn using OpenID Connect" →
   redirect URIs → Client ID/Secret).
2. User drops `JOBREF_LINKEDIN_CLIENT_ID` / `JOBREF_LINKEDIN_CLIENT_SECRET`
   into `.env` locally (already has placeholder lines) — no need to share
   the values in chat, Claude reads them from env.
3. Restart backend (`docker compose restart backend`), then a real
   register→LinkedIn→callback→complete-form→dashboard pass, plus the
   "already registered" dedup path (try registering the same LinkedIn
   account twice).
4. Once verified locally end-to-end: push, deploy (migration `0008`, backend
   redeploy, frontend redeploy), register the **production** redirect URI
   (`https://api.applaut.lvamo.com/api/v1/jobref/auth/linkedin/callback`) on
   the LinkedIn app alongside the localhost one, verify in production too.

---

## Status: Login built (email/password unchanged), registration now gated via LinkedIn OAuth — code complete, blocked on real LinkedIn credentials, not yet deployed

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

## LinkedIn OAuth registration (Aug 2026, code complete — not yet deployed)

Registration is now gated through LinkedIn OAuth (user's explicit request):
LinkedIn is the **only** option shown on the register page, used purely as
an identity/prefill source — **login stays email/password, unchanged.** The
account itself is only created once the user completes the existing
registration form (password + all employee/seeker fields); LinkedIn just
supplies verified name + email and prevents duplicate accounts.

**Flow** (server-driven redirects — the Client Secret never reaches the
frontend):
1. `/jobref/register` shows only a disclaimer (exactly what's requested:
   name + email, nothing else — no connections, no posting) + "Continue with
   LinkedIn", which is a plain link to `GET
   /api/v1/jobref/auth/linkedin/authorize` (a redirect, not an XHR call).
2. Backend builds LinkedIn's authorize URL with a signed, short-lived (5 min)
   `state` JWT for CSRF — stateless, no server-side session needed — and
   302s to LinkedIn.
3. LinkedIn redirects to the backend's registered callback, `GET
   /api/v1/jobref/auth/linkedin/callback`. Backend exchanges the code
   server-side (`app/jobref/services/linkedin.py`), calls LinkedIn's OIDC
   `userinfo` endpoint for `given_name`/`family_name`/`email`.
4. **Dedup on LinkedIn's stable member id (`sub`), not email** — checked
   against `jobref_users.linkedin_id` (new column, migration `0008`, `UNIQUE
   NOT NULL`) OR email match, both as defense in depth:
   - Already registered → redirect to `/jobref/login?linkedin=existing`
     (banner shown, login form unchanged below it).
   - New → mint a short-lived (15 min) signed `registration_token` carrying
     the verified LinkedIn id/email/name → redirect to
     `/jobref/register/complete?token=...`.
5. `RegisterComplete.tsx` fetches `GET /auth/linkedin/prefill?token=` to show
   exactly what was pulled from LinkedIn (transparency, per the user's
   request), pre-fills name (editable) + email (locked, badged "via
   LinkedIn ✓"), then the same password + domain + user_type + conditional
   employee/seeker fields as before. Submits to `POST /auth/register` with
   `registration_token` instead of a raw email — **the account's email and
   `linkedin_id` are always sourced server-side from the verified token,
   never trusted from client input** — a DB-level unique constraint on
   `linkedin_id` backstops the dedup against races (caught as 409).

**What changed, file by file:**
- Backend: `config.py` (+3 LinkedIn settings, +`frontend_base_url`),
  `core/security.py`'s `create_access_token` gained an optional
  `expires_minutes` override (generic, used for the short-lived state/
  registration tokens), `models/jobref_user.py` (+`linkedin_id` column),
  migration `0008_jobref_linkedin.py`, `schemas/auth.py`
  (`RegisterRequest.email` → `registration_token`; added
  `LinkedInPrefillResponse`), new `services/linkedin.py`, new
  `api/v1/routers/linkedin.py` (mounted in `router.py`),
  `services/auth.py`'s `register()` rewritten to decode the token and
  dedup on `linkedin_id`.
- Frontend: `api/auth.ts` (`RegisterPayload.email` → `registration_token`,
  +`linkedInAuthorizeUrl()`, +`getLinkedInPrefill()`), `pages/Register.tsx`
  rewritten as the disclaimer + LinkedIn-only CTA, new
  `pages/RegisterComplete.tsx` (the old form, minus a free-text email
  field), `pages/Login.tsx` (+banner for `?linkedin=existing`), new route
  `jobref/register/complete` in `App.tsx`.

**Verified this session** (backend has no real LinkedIn credentials yet, so
verified as far as possible without them):
- Backend: full callback→register flow exercised in-process against the
  real local DB with LinkedIn's token-exchange/userinfo calls mocked —
  registration succeeds, a second callback with the same LinkedIn `sub` is
  correctly caught as `existing_account`. `alembic upgrade head` (0008)
  clean. Truncated 6 leftover local test rows from last session (throwaway
  `@example.com` accounts, nothing real) since the new `linkedin_id` column
  is `NOT NULL` — noted here in case anyone wonders why the local dev table
  is suddenly empty.
- Frontend: `tsc --noEmit` + `vite build` clean. Full Playwright pass:
  `/jobref/register` shows zero email/password inputs, only the disclaimer +
  correctly-pointed LinkedIn link; `/jobref/register/complete` with no token
  shows the "start over" error state; `/jobref/login?linkedin=existing`
  shows the banner above an otherwise-untouched login form;
  `/jobref/register/complete?token=<real backend-issued token>` renders
  fully prefilled (name editable, email locked+badged) — all with zero
  console errors.

**Not yet possible without real credentials**: an actual browser round-trip
through LinkedIn's real consent screen, and production redirect URI
registration. See banner at top of this file for exact next steps.

## Resolved decisions (previously open)

- **`domain` field**: same free-text professional-field/industry concept
  for both employee and job-seeker registration — confirmed.
- **Registration gate**: open, no invite-gate.
- **CV Google-Drive-link**: required for job seekers.
- **`company_careers_url`**: made required for employees (core to the
  referral value prop — without it there's no way to point a job seeker at
  open roles).

## Next steps

- **See the banner at the top of this file** — currently blocked on the user
  creating the LinkedIn Developer App; that supersedes everything below
  until it's done.
- **⚠️ Still committed locally only, NOT pushed to `origin`** — the original
  auth commit (`3d5fd42`) plus this session's LinkedIn-gating work sit ahead
  of the remote. Don't push/deploy without checking with the user first —
  same standing rule as before, now compounded by "also not yet tested
  against real LinkedIn."
- Deploy (once approved *and* the LinkedIn flow is verified against real
  credentials locally): `git push`, then backend migration + redeploy on
  `lvamo-backend` (runs migrations `0007` and `0008`), frontend redeploy via
  Cloudflare Pages (auto, on push), register the production redirect URI on
  the LinkedIn app, then verify both in production (same pattern as every
  other deploy — health check + real register/login against production).
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
