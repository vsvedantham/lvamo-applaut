# Jobref — Progress

> Vertical-specific progress for Jobref. Platform-level infra/architecture
> lives in [`PROGRESS.md`](PROGRESS.md) — read that first if you haven't.

---

## Status: Not started

Jobref is a planned second vertical for LVAMO — a job-referral platform
connecting job seekers with employees willing to refer them at their
company. As of Aug 2026, only a frontend placeholder exists; there is no
backend, no database schema, no auth, and no product logic.

## What exists today

- **Frontend placeholder page** at `/jobref` (`frontend/src/jobref/pages/Jobref.tsx`)
  — a static "Jobref is coming soon" message, linked from the LVAMO hub
  (`/`). Uses the shared `frontend/src/components/BrandedPage.tsx` shell —
  no dependency on Applaut's routing, layout, or auth code.
- **Reserved namespace** (not yet mounted, just reserved by convention —
  see `PROGRESS.md` → Multi-Vertical Architecture): when a backend is
  built, it should mount under `/api/v1/jobref/*`, and any frontend
  auth/session should use a `jobref_access_token` localStorage key so it
  can't collide with Applaut's.
- **Folder structure convention already set** (see `PROGRESS.md` →
  "Codebase structure matches the URL structure"): backend code should go
  in `backend/app/jobref/` mirroring `app/applaut/`'s shape (models,
  schemas, services, `api/v1/routers/`), reusing the shared
  `app/db/session.py` + `app/db/base.py` + `app/core/security.py` +
  `app/core/storage.py` rather than duplicating them. Frontend code should
  go in `frontend/src/jobref/{api,components,context,pages}/` mirroring
  `src/applaut/`'s shape.

## Next steps (none started yet)

- Product/requirements definition — mostly gathered (login: email+password;
  registration: first/last name, email, German phone, password, user type
  [employee / job seeker] with conditional fields per type — see the
  in-progress design discussion for full field list) but one open question
  remains: whether the "domain" field (professional field/industry, e.g.
  "Data Engineering") means the same thing for both employee and job-seeker
  registration, free text either way. Registration will be open (no
  invite-gate), and the CV Google-Drive-link field is required for job
  seekers.
- Database schema design (own tables in `backend/app/jobref/models/`,
  sharing the same Postgres instance on `lvamo-backend` for now — see
  `PROGRESS.md`'s note that verticals can share or split infra as needed)
- Backend build (FastAPI router under `/api/v1/jobref/*`, in
  `backend/app/jobref/`)
- Auth mechanism (independent of Applaut's, per platform architecture —
  separate `jobref_users` table, separate `jobref_access_token`)
- Frontend build-out beyond the placeholder page (`frontend/src/jobref/`)
