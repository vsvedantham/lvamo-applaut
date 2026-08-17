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

- **Frontend placeholder page** at `/jobref` (`frontend/src/pages/Jobref.tsx`)
  — a static "Jobref is coming soon" message, linked from the LVAMO hub
  (`/`). Uses the shared `frontend/src/components/BrandedPage.tsx` shell —
  no dependency on Applaut's routing, layout, or auth code.
- **Reserved namespace** (not yet mounted, just reserved by convention —
  see `PROGRESS.md` → Multi-Vertical Architecture): when a backend is
  built, it should mount under `/api/v1/jobref/*`, and any frontend
  auth/session should use a `jobref_access_token` localStorage key so it
  can't collide with Applaut's.

## Next steps (none started yet)

- Product/requirements definition — none written yet
- Database schema design (own tables; can live in the same Postgres
  instance on `lvamo-backend` initially, or its own — see `PROGRESS.md`'s
  note that verticals can share or split infra as needed)
- Backend build (FastAPI router under `/api/v1/jobref/*`)
- Auth mechanism (independent of Applaut's, per platform architecture)
- Frontend build-out beyond the placeholder page
