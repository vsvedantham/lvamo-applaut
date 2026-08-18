# Jobref — Progress

> Vertical-specific progress for Jobref. Platform-level infra/architecture
> lives in [`PROGRESS.md`](PROGRESS.md) — read that first if you haven't.

---

## 🎯 NEXT SESSION PRIMARY TASK

**Auth is now fully closed out end-to-end, both paths, in production (Aug
2026).** Two things landed this session:

1. **DB restructured and deployed**: Jobref's 3 tables
   (`jobref_users`/`jobref_employee_profiles`/`jobref_seeker_profiles`, all
   unschemaed in `public`) merged into one flat `jobref.users` table in a
   dedicated `jobref` Postgres schema, `is_employee` boolean as the sole
   differentiator, every type-specific field `NULL` for the other type
   (migration `0013`). Deployed and verified in production. See "DB
   restructure: single jobref.users table" below.
2. **The last standing gap is closed**: the user completed a real
   job-seeker registration through the actual LinkedIn consent screen
   against production (`www.lvamo.com/jobref/register` → Job Seeker →
   real LinkedIn login/approve → completed form) — confirmed via direct DB
   query: a row with a real `linkedin_id` populated. Alongside a real
   employee registration, both landed correctly in `jobref.users`. **Both
   registration paths are now proven end-to-end in production with real
   data, not mocks or minted tokens.**

**Also this session**: the shared Postgres role/database was renamed
`applaut` → `lvamo` (affects both verticals — see `PROGRESS.md`).

**Next major work**: auth is done; the actual referral-matching product
logic (how a job seeker gets connected to a referring employee at the same
company/domain) is undesigned and is the next feature to scope.

---

## Older: employee registration form settled (Aug 2026, deployed)

**Employee registration form is now fully settled (Aug 2026, deployed) —
three rounds same day, all live:**

1. New required field, "How many referral requests can you review per day?"
   (wording tweaked from "view" → "review" later the same day, copy-only,
   field name unchanged)
   (`Max 5`/`5-10`/`10-20`/`No Cap`), migration `0010`.
2. Job Seeker disclaimer reworded to general platform-policy phrasing.
3. The old "I can refer other candidates" checkbox removed entirely —
   referral capacity is now asked directly: "How many referrals can you do
   in a…" with a Week/Month segmented toggle, then the *same* bucketed
   scale as #1 above (not a raw number). `can_refer`/`refer_count` dropped
   from the schema, migration `0011`.

All verified live in production with real API calls (`201`/`422` on
valid/missing data) and against the live frontend (`www.lvamo.com`) —
zero checkboxes left in the form, both toggle buttons functional, Applaut
regression clean each round. See "Referral capacity" and "New employee
field + disclaimer reword" sections below for full detail.

**Still outstanding, unchanged**: nobody has completed a real *job-seeker*
registration through the actual LinkedIn consent screen and final form
submission — only the OAuth handshake itself (real) and a mocked-token
submission have exercised that path. The employee path is fully verified
end-to-end in production with real data (both before and after this UX
change). **Next session**: one real seeker signup at
`https://www.lvamo.com/jobref/register` (Job Seeker card) to close this out.

---

## Status: Live in production — employee registration form fully settled (referral capacity always-asked and bucketed, no can_refer checkbox), deployed Aug 2026

## DB restructure: single `jobref.users` table (Aug 2026, verified locally)

User's explicit request: replace the 3-table split
(`jobref_users`/`jobref_employee_profiles`/`jobref_seeker_profiles`, all
unschemaed in `public`) with **one** table, `jobref.users` — living in the
`jobref` Postgres schema (created empty in migration `0012`, see
`PROGRESS_APPLAUT.md`; this is the deferred follow-up that closes that
out), with `is_employee` (boolean) as the sole differentiator and every
field only meaningful to one user type left `NULL` for the other.

**Decisions clarified before implementing** (flagged since several parts
of the original ask were non-standard vs. how the rest of the app is
built — user's own house rule is to call these out):
- **`NULL` for "not applicable" fields, not the literal string `"NA"`** —
  keeps `working_since` a real `DATE`, the four bucketed fields real
  constrained values, etc. Matches the existing `linkedin_id` column's
  convention (already nullable UNIQUE) rather than forcing every column to
  plain text.
- **A 5-digit auto-increment user ID was dropped entirely** — first
  proposed as a friendly extra column, but once discussed further the user
  concluded it's unnecessary since UUID is already the primary key. No
  integer ID column exists on the merged table.

**Migration `0013_jobref_merge_users_table.py`**: creates `jobref.users`
with all columns from the 3 old tables flattened in, `is_employee` in
place of the old `user_type` enum, 4 enum-membership CHECK constraints (as
before — Jobref's enums have always been plain `VARCHAR` + `CHECK`, not
native Postgres enum types, unlike Applaut's) plus 5 new CHECK constraints
enforcing the employee/seeker field-presence rules at the DB level
(defense in depth over the existing Pydantic conditional validation) —
required-when-employee, absent-when-seeker, required-when-seeker,
absent-when-employee, and the `notice_join_date`-iff-`serving_notice` rule.
Data is carried over via `INSERT ... SELECT` with a `LEFT JOIN` across the
3 old tables (not a destructive rebuild) before they're dropped.
`downgrade()` reverses it faithfully — recreates the 3 old tables in their
exact pre-migration shape (matching the cumulative result of migrations
`0007`–`0011`) and splits the data back out.

**Code changes**:
- `models/enums.py` (new) — `JobrefUserType`, `ReferFrequency`,
  `ReferralViewCapacity`, `JobSeekerStatus` all consolidated here (matches
  the `app/applaut/models/enums.py` convention already used on the Applaut
  side). `JobrefUserType` survives as a pure API-level type (still backs
  `RegisterRequest`'s discriminated union) even though it's no longer a DB
  column.
- `models/jobref_user.py` — single `JobrefUser` model, `__tablename__ =
  "users"`, `__table_args__ = {"schema": "jobref"}`. `models/
  jobref_employee_profile.py` and `models/jobref_seeker_profile.py`
  deleted (their model classes no longer exist; their enums moved to
  `enums.py`).
- `services/auth.py` — `_register_employee`/`_register_seeker` now build
  one `JobrefUser` row with every field set directly, instead of a user
  row plus a separate child-profile row across two inserts.
  `get_current_user` does a plain `db.get(JobrefUser, id)` — the old
  `_get_with_profiles` `selectinload` helper is gone, nothing to eager-load
  any more.
- `schemas/user.py` — **API response contract deliberately left
  unchanged** (still nested `employee_profile`/`seeker_profile` objects
  under `JobrefUserResponse`, still a `user_type` field) so **zero
  frontend changes were needed**. Added `JobrefUserResponse.from_user()`,
  which reshapes the flat ORM row back into that nested shape; the `/me`
  route now calls it explicitly rather than relying on Pydantic
  `from_attributes` against relationship attributes that no longer exist.
- `migrations/env.py` — updated the now-stale
  `JobrefEmployeeProfile`/`JobrefSeekerProfile` import.

**Verified locally** (real, not mocked): migration applied cleanly;
`\d jobref.users` confirms the exact intended shape (21 columns, all 9
CHECK constraints, both UNIQUE constraints); old 3 tables gone. Full API
round trip after a backend restart: employee register → `201`, `/login` →
`200`, `/me` → `200` with `employee_profile` correctly populated and
`seeker_profile: null`; missing a required employee field → `422`; job
seeker register via a minted registration token (same pattern used for
LinkedIn-flow testing when real credentials aren't being exercised) →
`201`, `/me` → `200` with `seeker_profile` populated (incl.
`notice_join_date`) and `employee_profile: null`. Direct DB check confirms
one row per user with the other type's fields genuinely `NULL` (not
`"NA"`). Regression: Applaut health/login and Jobref health/LinkedIn-
authorize-redirect all unaffected. Frontend: `tsc --noEmit` clean with
zero file changes on the frontend side, confirming the API contract really
didn't move.

**Deployed and re-verified in production**: migration `0013` ran clean on
the VM. The 3 disposable test rows that were in the old
`public.jobref_users` (`claude.verify.employee@example.com`, `prod.
fieldverify@example.com`, `prod.capacityverify@example.com` — all Claude's
own earlier verification accounts) carried over into `jobref.users`
correctly via the migration's `INSERT ... SELECT`, confirmed via direct DB
query. A real registration + cleanup against prod re-confirmed the write
path; Applaut/Jobref health and login regression checks clean.

## Referral capacity: always-asked, bucketed scale (Aug 2026, live in production)

Follow-up to the field added in the previous entry — user's explicit
request: drop the "I can refer other candidates at my company" checkbox,
ask the capacity question directly and unconditionally, and reuse the
*same* bucketed answer scale as the daily-view-cap field instead of a free
number.

- **UI**: "How many referrals can you do in a…" followed by a Week/Month
  segmented toggle (two buttons, not a dropdown — chosen for a binary
  choice, matches the app's existing card/button visual language), then a
  `<select>` with the same four options as `daily_referral_view_cap` (`Max
  5`/`5 - 10`/`10 - 20`/`No Cap`). Always visible now — no conditional
  reveal, no checkbox anywhere in the form.
- **Backend**: `can_refer` (boolean) and `refer_count` (integer) dropped
  entirely from `jobref_employee_profiles`. `refer_frequency` goes from
  optional/conditional to always `NOT NULL`. New `referral_capacity` column
  reuses the `ReferralViewCapacity` enum (same Python enum class as
  `daily_referral_view_cap`, given a distinct SQL constraint name —
  `jobref_referral_capacity` vs. `jobref_referral_view_capacity` — since two
  CHECK constraints on the same table need distinct names even when they
  share a value set). `EmployeeDetails`'s old conditional validator
  (`check_refer_fields`) is gone too — nothing conditional left to validate.
  Migration `0011`: drops the old `jobref_employee_refer_fields_chk`
  constraint first (since it referenced the columns being dropped),
  backfills the same handful of disposable test rows, enforces the new
  `NOT NULL`s.
- **Also updated**: `Dashboard.tsx` (which reads `employee_profile` fields)
  — was still referencing `can_refer`/`refer_count`, caught immediately by
  `tsc` failing the build. Now shows two rows: "Referrals" (bucketed
  capacity + frequency) and "Requests viewed" (daily view cap), via a small
  `CAPACITY_LABEL` lookup shared for both.

**Verified locally** (real, not mocked): backend — register with both new
fields → `201`; missing `referral_capacity` → `422`. Frontend — `tsc`/`vite
build` clean (only after fixing the `Dashboard.tsx` fallout above — a real
example of why a full build check catches more than just the page you're
looking at); Playwright confirms zero checkboxes in the form, both toggle
buttons present and functional (clicked "Month", it took), a full real
browser submission through choice→employee form→both new fields→submit
lands on `/jobref/dashboard`, which correctly displays the submitted values
("10 - 20 Per Month", "5 - 10 Per Day" in this run).

**Deployed and re-verified in production**: pushed, migration `0011` ran
clean on the VM, Cloudflare Pages auto-rebuilt. Re-ran the same checks
directly against production: real registration with both fields → `201`,
missing `referral_capacity` → `422`; `www.lvamo.com` confirmed showing
zero checkboxes and both working toggle buttons; Applaut regression clean.

## New employee field + disclaimer reword (Aug 2026, live in production)

Two small, unrelated changes requested together:

**1. New required employee field**: "How many referral requests can you
view per day?" — a dropdown (`Max 5` / `5 - 10` / `10 - 20` / `No Cap`)
placed immediately before the existing "I can refer other candidates"
checkbox section, per the user's specified placement. Deliberately modeled
as a *separate* dimension from `can_refer`/`refer_frequency`/`refer_count`
(which is about how many candidates they'll actively refer) — this is about
capacity to review *incoming* requests, so it's always required, not gated
behind the `can_refer` checkbox.

- Backend: new `ReferralViewCapacity` str-enum
  (`up_to_5`/`5_to_10`/`10_to_20`/`no_cap`) in
  `models/jobref_employee_profile.py`, new `daily_referral_view_cap` column
  (`NOT NULL`, CHECK constraint), migration `0010`. `EmployeeDetails`
  schema and `EmployeeProfileResponse` both updated; `_register_employee`
  persists it.
  - **Existing-row backfill note**: only disposable test data exists in
    `jobref_employee_profiles` at this point (Jobref just launched, no real
    employees registered yet) — the migration backfills those rows to
    `'no_cap'` before enforcing `NOT NULL`, since every *new* registration
    now always supplies a real answer via the required form field. Worth
    knowing if this migration is ever read later and the backfill value
    looks arbitrary — it is, deliberately, because no real user's answer
    existed to preserve.
- Frontend: `EmployeeDetails`/`ReferralViewCapacity` types in `api/auth.ts`,
  new `<select>` in `Register.tsx`'s employee form at the exact position
  requested, defaults to `up_to_5`.

**2. Disclaimer reworded** (Job Seeker panel) — user's specific concern:
the old copy ("...so you don't end up with more than one account")
indirectly framed *the user* as the one who might create duplicates. New
copy states the platform's general policy instead, no "you" framing: "We
use LinkedIn to sign you in. We only take your name and email address from
your LinkedIn profile — nothing else. This is used to prevent duplicate
accounts on Jobref."

**Verified locally** (real, not mocked): backend — register with the new
field → `201`; register missing the field → `422` field-required error,
confirming it's genuinely enforced. Frontend — `tsc`/`vite build` clean;
Playwright confirms the new field's label is present and correctly
positioned, a full real browser submission through the choice→employee
form→new field→submit flow lands on `/jobref/dashboard`; the seeker panel
shows the new disclaimer text and confirms the old accusatory phrasing is
gone.

**Deployed and re-verified in production**: pushed, `deploy.sh` ran
migration `0010` clean on the VM, Cloudflare Pages auto-rebuilt. Re-ran the
same checks directly against production: real registration with the field
→ `201`, missing it → `422`; `www.lvamo.com` frontend confirmed showing the
new field (correct position) and the new disclaimer text (old phrasing
gone); Applaut regression clean. Zero console errors throughout.

## Progressive disclosure: choice screen first, then the relevant path only (Aug 2026, live in production)

Same-day UX refinement on top of the split-registration work below — user's
request, reasoning given directly: the always-visible two-column layout
(full employee form + LinkedIn card side by side) "looks okay" on desktop
but crowds mobile with a full form and a competing option both visible at
once. Changed `/jobref/register` to a three-state flow instead:

1. **Choice screen** (default, no query param) — just "I am a" + two large
   tappable cards (Full-time Employee / Job Seeker), zero form fields, zero
   LinkedIn button. Nothing to scroll past on mobile.
2. **`?as=employee`** — the full direct-registration form (unchanged
   fields/logic from the split-registration work), plus a "← Back" link.
3. **`?as=job_seeker`** — the disclaimer + "Continue with LinkedIn" button
   (unchanged), plus "← Back".

**Why a URL param instead of just `useState`**: so the browser's native
back button works correctly (returns to the choice screen, not off the
page or to a stale form) and a direct link/refresh to `?as=employee` lands
correctly too — both verified via Playwright (`page.goBack()` after
picking a path correctly landed back on the zero-input choice screen).

Backend untouched — this is purely `frontend/src/jobref/pages/Register.tsx`
restructured around the same `EmployeeRegisterPayload`/LinkedIn-authorize
logic as before; `RegisterComplete.tsx` (the post-LinkedIn seeker form) is
unaffected.

**Verified locally**: `tsc --noEmit` + `vite build` clean. Playwright across
desktop + mobile viewports: choice screen has zero `<input>`/LinkedIn-button
elements; clicking each card updates the URL and reveals only that path's
content; "Back" link and the browser's actual back button both correctly
return to the zero-input choice screen; zero console errors throughout. Full
real browser submission of the employee form through the new flow (choice →
fill → submit) → landed on `/jobref/dashboard` cleanly, same as before this
change.

**Deployed and re-verified in production** (pure frontend change, no
migration needed): pushed, Cloudflare Pages auto-rebuilt, live within
moments — re-ran the same checks against `https://www.lvamo.com/jobref/register`
itself: zero-input choice screen, employee card reveals the form with the
correct `?as=employee` URL, and the browser's actual back button correctly
returns to the zero-input choice screen. Zero console errors.

## Split registration: employees direct, job seekers via LinkedIn (Aug 2026, live in production)

Same-day follow-up to the LinkedIn-gated registration work above — user's
explicit request: **employees should not have to go through LinkedIn at
all.** Registration is now split into two independent paths sharing one
page:

- **`/jobref/register`** is now two side-by-side cards under a shared
  "I am a" heading (stacks vertically on mobile via plain flexbox
  `flexWrap` reflow — this codebase's existing responsive convention, no
  CSS breakpoints needed): **Full-time Employee** (left) has the complete
  registration form inline — name, email, phone, password, domain, company
  fields — and submits directly, no LinkedIn involved at all. **Job
  Seeker** (right) is unchanged from before: a short disclaimer + "Continue
  with LinkedIn", flowing into `/jobref/register/complete` exactly as
  before.
- **Disclaimer copy updated** (user's request) — dropped the "we don't see
  your connections, we never post on your behalf" language; now just:
  "We only take your name and email address from your LinkedIn profile —
  nothing else — just so you don't end up with more than one account."
  Shorter, states the *reason* (dedup) rather than a list of things it
  isn't.
- **`/jobref/register/complete`** (the post-LinkedIn form) simplified —
  dropped the "I am a" employee/seeker toggle and all employee-specific
  fields, since this page is now only ever reached via the job-seeker
  LinkedIn path. Seeker fields only.

### Backend: discriminated union replaces the single conditional schema

`RegisterRequest` was a single Pydantic model with optional
`employee`/`seeker` fields and a manual validator enforcing "the one
matching `user_type` must be set." Replaced with two separate models
(`EmployeeRegisterRequest`, `SeekerRegisterRequest`) combined into a
`Annotated[Union[...], Field(discriminator="user_type")]` — FastAPI/Pydantic
route the request body to the correct model automatically, so each shape
only carries the fields it actually needs (no `Optional[EmployeeDetails] =
None` sitting on a seeker payload, no "must supply email OR
registration_token depending on type" ambiguity). `services/auth.py`'s
`register()` is now a thin dispatch (`isinstance` check) to
`_register_employee` / `_register_seeker`, each with its own dedup logic:

- **Employee**: dedup by email only (same as pre-LinkedIn registration
  ever was) — `linkedin_id` is `NULL`.
- **Seeker**: unchanged — dedup by `linkedin_id` (primary) or email
  (defense in depth), identity sourced from the verified
  `registration_token`, exactly as before.

**DB change**: `jobref_users.linkedin_id` was `NOT NULL UNIQUE` — now just
`UNIQUE` (nullable), migration `0009`. Postgres allows multiple `NULL`s
under a `UNIQUE` constraint, so this doesn't weaken the seeker-side dedup
at all; it just lets employees have no LinkedIn identity.

### Verified locally (real, not mocked)

- Backend: both paths exercised directly against the real local DB —
  employee register → `201`, duplicate email → `409 "Email already
  registered"`; seeker register (via a minted registration token, same
  pattern as the earlier mocked test) → `201`; malformed employee payload
  (missing `employee` key) → `422` with a clear field-location error.
  Confirmed in DB: employee row has `linkedin_id = NULL`, seeker row has
  the real value.
- Frontend: `tsc --noEmit` + `vite build` clean. Playwright: desktop
  screenshot shows the two-column split exactly as specified (single email
  input — employee's — confirming no LinkedIn-path fields leaked into the
  employee card); mobile screenshot confirms clean vertical stacking.
  **Full real browser submission** of the employee form (fill every field,
  click "Create account") → landed on `/jobref/dashboard`, zero console
  errors — this is a real gap closed from the previous entry, where nobody
  had completed an actual submission end-to-end through the UI.

### Not yet done

- ✅ Pushed and deployed — see banner at top of this file for the production
  verification log.
- The job-seeker path's *actual account-creation step* (as opposed to just
  the OAuth handshake) still hasn't been exercised through a real LinkedIn
  consent screen + real form submission — only via a minted token. Still
  the one open gap — see banner at top of this file.

### Mobile-first follow-up: app-wide input sizing fix (same session)

User asked directly whether this work was mobile-first — honest answer was
"the layout reflows correctly, but two real gaps exist in the shared global
CSS that this input-dense form inherits and would expose most": input
`font-size` was `0.875rem` (14px, computed — root `html` has no explicit
`font-size` so `rem` resolves against the 16px browser default, not the
body's 15px), below the 16px threshold that prevents iOS Safari's
auto-zoom-on-focus; and touch-target height (~34-39px) sat under the 44px
Apple HIG / WCAG 2.5.5 comfort guideline (still cleared WCAG 2.2 AA's 24px
hard minimum, so not a strict compliance failure, just below best practice).
Playwright/Chromium doesn't reproduce the iOS zoom behavior, so this wasn't
caught by any of the earlier screenshot-based checks — only surfaced by
actually computing `font-size` in px via `getComputedStyle`.

**Fixed app-wide** in `frontend/src/index.css`'s shared `input, select,
textarea` rule (affects every form in both verticals, not just this page):
`font-size: 0.875rem` → `1rem` (16px), `padding: 0.5rem 0.75rem` → `0.75rem`
(pushes intrinsic height to 46px, clearing the 44px guideline). Verified via
`getComputedStyle` at a 390px mobile viewport across Jobref register/login
*and* Applaut login (regression) — all report `font-size: 16px`; register's
email input measures 46px tall. Full visual regression (`tsc`, `vite
build`, Playwright screenshots at desktop + mobile across 4 pages) — zero
console errors, no visual breakage. Re-ran the real employee-form browser
submission end-to-end after the change — still lands on `/jobref/dashboard`
cleanly with the larger inputs.

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

## LinkedIn OAuth registration (Aug 2026, live in production)

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

**Update — real LinkedIn credentials arrived, tested for real (Aug 2026):**
user created the LinkedIn app, credentials added to local `.env`. Full real
browser round-trip through the actual LinkedIn consent screen worked
cleanly, confirmed via backend logs: `authorize` → 307 to LinkedIn →
`callback?code=...` → 307 to `/jobref/register/complete?token=...` →
`prefill` → 200 OK with real decoded data (real email, real name). No mocks
involved. **However, the user stopped there and asked to deploy before
submitting the completed form** — so the actual `register()` call (password
hash, employee/seeker fields, `linkedin_id` insert) is still only verified
by Claude's earlier synthetic/mocked test, never by a real submission. See
"Production deploy" below and the banner at the top of this file.

---

## Production deploy (Aug 2026)

Pushed and deployed end-to-end, same session as the real LinkedIn OAuth
test above. Sequence:

1. `.env.production` on the VM was missing the LinkedIn/frontend-URL vars
   entirely (checked via `grep -oE '^[A-Z_]+='` — names only, values never
   printed; a plain `cat` of the file was correctly blocked by the
   permission classifier since it's a secrets file). Appended
   `JOBREF_LINKEDIN_CLIENT_ID`, `JOBREF_LINKEDIN_CLIENT_SECRET`,
   `JOBREF_LINKEDIN_REDIRECT_URI=https://api.jobref.lvamo.com/api/v1/jobref/auth/linkedin/callback`,
   `FRONTEND_BASE_URL=https://www.lvamo.com` directly via SSH heredoc, never
   round-tripped through a local file. Confirmed `BACKEND_CORS_ORIGINS`
   already included `https://www.lvamo.com` — no change needed there.
2. `git push origin main` — 6 commits (LinkedIn gating, dedicated hostname,
   var rename, this doc's updates).
3. `bash deploy.sh` on the VM — hit one snag: the VM's working copy of
   `nginx/nginx.conf` had an uncommitted local diff (from the earlier direct
   `scp` when setting up the dedicated hostname, done outside git on
   purpose at the time) that blocked `git pull`. Diffed it against
   `origin/main`'s version first to confirm byte-identical content, then
   `git checkout -- nginx/nginx.conf` to discard the redundant local copy
   and let the pull proceed. `deploy.sh` then ran clean: pulled, rebuilt the
   backend image, ran `alembic upgrade head` (`0006`→`0007`→`0008`),
   recreated the backend container, pruned old images. `nginx`/`postgres`
   untouched (no config changes to those this deploy).
4. **Verified in production** (all real, no mocks):
   - `GET https://api.jobref.lvamo.com/api/v1/jobref/health` → `200 OK`.
   - LinkedIn `authorize` redirect on the prod hostname carries the real
     `client_id` and the correct prod `redirect_uri`
     (`https://api.jobref.lvamo.com/...`, not the localhost one).
   - Regression: `api.applaut.lvamo.com` health + a real login attempt
     (401 on bad credentials, not a crash) — unaffected by any of this.
   - Playwright against the live production frontend: `/jobref/register`
     shows the LinkedIn-only page with the button correctly pointed at
     `api.jobref.lvamo.com` (proves the Cloudflare Pages env-var rename from
     earlier took effect on this build); `/applaut/login`'s failed-login
     error message rendered (proves it's hitting the real prod API under
     `VITE_APPLAUT_API_BASE_URL`, not falling back to `localhost:8000`) —
     zero console errors beyond the deliberately-triggered 401.
5. **Not verified in production**: an actual completed registration (see
   the callout above and the banner at the top of this file) — the user
   asked to deploy before finishing that local test, so the very first real
   account creation, whenever it happens, is also the first real test of
   that code path.

## Dedicated hostname: `api.jobref.lvamo.com` (Aug 2026, live)

Jobref's production backend now has its own hostname instead of sitting
under Applaut's (`api.applaut.lvamo.com` predates Jobref as a concept — see
`PROGRESS.md`'s Multi-Vertical Architecture section for the durable policy).
Live and verified today; only the DNS/TLS/nginx layer — no vertical code was
deployed as part of this.

**What was done:**
1. DNS: `A api.jobref.lvamo.com → 130.61.106.172`, DNS-only (grey-cloud,
   matching `api.applaut.lvamo.com`'s pattern), via the Cloudflare API.
2. TLS cert: `certbot certonly --webroot -w /var/www/certbot -d
   api.jobref.lvamo.com` on the VM — issued with **zero nginx downtime**,
   unlike the original `api.applaut.lvamo.com` cert which was issued via
   `--standalone` (had to, at the time — nginx didn't exist yet, chicken-
   and-egg problem, see "Oracle Backend Migration" in `PROGRESS.md`).
   Expires 2026-11-16, auto-renews via the existing `certbot.timer`.
   - **⚠️ Latent issue noticed, not fixed**: `api.applaut.lvamo.com`'s
     renewal config still says `authenticator = standalone`, which needs
     port 80 free — but the nginx Docker container now permanently holds
     port 80 (`restart: always`), with no pre/post renewal hook to stop it.
     Auto-renewal for that cert will likely **fail** when it's actually due
     (~mid-Oct 2026, 30 days before the Nov 15 expiry). Not urgent today,
     but worth fixing before then — either switch that cert to `--webroot`
     like Jobref's (re-issue once, same webroot path already exists in
     nginx.conf), or add a stop/start-nginx renewal hook.
3. `nginx/nginx.conf`: added a second `server { listen 443 ssl; server_name
   api.jobref.lvamo.com; ... }` block, proxying to the same `backend:8000`
   as the Applaut block — same shared backend process, just a second front
   door. Deployed to the VM directly (`scp` + `nginx -s reload`, no
   container restart, no downtime) since this is pure infra config, not the
   gated Jobref feature deploy — also committed to git locally.
4. Frontend: `jobref/api/client.ts` and `jobref/api/auth.ts` now read
   `VITE_JOBREF_API_BASE_URL` (own env var) instead of sharing Applaut's
   base URL var — both fall back to `http://localhost:8000` in dev (single
   shared backend container locally, so no behavior change there; verified
   via a real dev-server + Playwright check that the LinkedIn button's href
   is unchanged locally).
5. **Applaut's own var renamed too, for consistency**: `VITE_API_BASE_URL` →
   `VITE_APPLAUT_API_BASE_URL` (user's request, once two verticals existed
   side by side, `VITE_API_BASE_URL` was ambiguous about which backend it
   pointed at). Updated in `applaut/api/client.ts`, `.env`/`.env.example`,
   `README.md`.
   **⚠️ This one is already live in production** (unlike
   `VITE_JOBREF_API_BASE_URL`, which is net-new) — the Cloudflare Pages
   build var must be renamed too, in the same dashboard step as adding the
   Jobref one below, or the next Applaut frontend redeploy will silently
   fall back to `localhost:8000` and break the production API base URL.

**Verified:** new hostname serves the correct cert (`CN=api.jobref.lvamo.com`)
and correctly proxies to the shared backend (tested via the existing Applaut
health endpoint, since Jobref's own routes aren't deployed yet — got a clean
200). Old hostname re-tested afterward, unaffected. `tsc`/`vite build` clean
after the frontend env-var split.

**All of the below are now done** — see "Production deploy" above for the
full log:
- ✅ Cloudflare Pages build env vars renamed/added by the user, confirmed
  live on the current build (Playwright-verified against
  `www.lvamo.com` post-deploy).
- ✅ Production redirect URI registered on the LinkedIn app and confirmed
  working (real consent-screen round trip, see "LinkedIn OAuth
  registration" above).
- ✅ `.env.production` on the VM has the LinkedIn credentials +
  `FRONTEND_BASE_URL`.

## Resolved decisions (previously open)

- **`domain` field**: same free-text professional-field/industry concept
  for both employee and job-seeker registration — confirmed.
- **Registration gate**: open, no invite-gate.
- **CV Google-Drive-link**: required for job seekers.
- **`company_careers_url`**: made required for employees (core to the
  referral value prop — without it there's no way to point a job seeker at
  open roles).

## Next steps

- Auth is done — both registration paths (employee direct, job seeker via
  real LinkedIn OAuth) are proven end-to-end in production with real data.
  See the banner at the top of this file.
- Beyond auth: the actual referral-matching product logic (how a job
  seeker gets connected to a referring employee at the same company/domain)
  is not yet designed — next major feature after this auth foundation ships.
- The latent `api.applaut.lvamo.com` cert auto-renewal risk noted in
  "Dedicated hostname" above (due ~mid-Oct 2026) is still unfixed — worth
  doing before then, low effort (switch to `--webroot` like Jobref's cert).

---

### Session update — auth built, deploy held (committed `3d5fd42`, local only)

Session end state, Aug 2026: full login/registration feature built and
verified locally (see "What exists today" above for the complete
breakdown). Committed to local `main` but the user chose not to push/deploy
today — everything above this line describes code that exists on disk and
in the local git history, not (yet) in production.
