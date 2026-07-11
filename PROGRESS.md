# Applaut — Project Progress

> **How to use this file**
> At the start of each session: "read PROGRESS.md and let's continue"
> At the end of each session: "save progress" — update this file and commit it

---

## Deployment

| Layer | Status | URL / Location |
|---|---|---|
| Frontend | Live | `www.lvamo.com` (Cloudflare Pages, auto-deploys on push to `main`) |
| Backend API | Live | `api.applaut.lvamo.com` (Oracle Cloud VM, Docker) |
| Database | Live | PostgreSQL 16 in Docker on VM, accessible via SSH tunnel for DBeaver |
| Storage | Configured | Cloudflare R2 (resumes, documents) |

**VM access:** `ssh -i C:\Users\vvenk\Downloads\ssh-key-2026-07-10.key ubuntu@130.61.65.131`
**App dir on VM:** `/home/ubuntu/lvamo-applaut/`
**Deploy backend:** `sudo docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build backend`

---

## What Is Built and Working

### Auth
- JWT-based login / register
- Registration is currently **locked** (invite-only) via `application_settings` table
- To open registration: set `allow_new_registrations = '1'` in `application_settings` via DBeaver

### User Profile
- Onboarding wizard (3 steps): name, roles, countries, employment types, skills, languages
- Per-profile `good_threshold` slider (70–100, default 85)
- Near-miss threshold = `good_threshold - 15`

### Discovery Engine
- Adapter pattern — 4 adapters implemented: **Greenhouse, Lever, Ashby, Personio**
- Company list in `backend/app/discovery/companies.py`
- Scheduled via APScheduler (`backend/app/discovery/scheduler.py`)
- Location resolution: city → country code (`backend/app/discovery/location.py`)
- Manual trigger available via API

### Scoring
- **Rule-based scorer** (`backend/app/scoring/rule_based.py`):
  - 5 dimensions: role(35), skills(25), location(20), employment_type(10), experience(10)
  - Role synonym expansion (data engineer, devops, etc.)
  - Skills score uses JD keyword count as denominator (% of what job requires)
  - Re-scores ALL active opportunities on every run (upsert — no stale results)
  - Preserves user decisions across re-scoring runs
- **AI scorer** (`backend/app/scoring/ai_scorer.py`):
  - Uses `gpt-4o-mini` via `AsyncOpenAI`
  - Only scores previously-unscored opps (cost control)
  - Returns per-dimension explanations + near-miss keywords
- Near-miss gap analysis: keywords the user lacks, suitability assessment
- User decisions on near-misses: keep / dismiss / keep_with_keywords

### Document Generation
- Tailored resume + cover letter generation via OpenAI
- Stored in Cloudflare R2, metadata in PostgreSQL
- `generated_documents` table with download links

### Applications
- Application tracking (status: draft → submitted → interviewing → offer → rejected)
- Kanban-style view on Applications page

### Notifications
- In-app notification system with unread badge
- Auto-notified on discovery results

### Audit Log
- Every major action logged to `audit_logs` table
- Viewable in AuditLog page (`/audit`)

### UI
- Dark futuristic theme with CSS custom properties (design tokens)
- Inter font via Google Fonts
- Custom SVG favicon (geometric "A" mark)
- **Mobile-responsive**: slide-in sidebar with backdrop on ≤768px, fixed top bar with hamburger
- Pages: Landing, Login, Register, Onboarding, Dashboard, Opportunities, Scores, Applications, Resume, AuditLog, OpportunityDetail, DocumentDetail

---

## Database

**6 migrations applied** (`backend/migrations/versions/`):
- `0001` — initial schema (users, profiles, resumes, opportunities, scores, applications, generated_documents, notifications, audit_logs)
- `0002` — scoring columns
- `0003` — document columns
- `0004` — profile discovery timestamps
- `0005` — profile score threshold (`good_threshold`)
- `0006` — `application_settings` table

**Key DB notes:**
- Scoring thresholds currently set to **GOOD=50, NEAR_MISS=35** in the DB for testing
- Revert to GOOD=85, NEAR_MISS=70 before go-live (update `good_threshold` in `profiles` table)

---

## Known Issues / Deferred Work

- **Individual page mobile polish** — Layout is now responsive, but page-level content (cards, grids, tables) may still need padding/sizing tweaks on small screens. Not yet reviewed page-by-page.
- **AI scoring** — fixed (async client), but not yet tested end-to-end in production with real data.
- **Workday, LinkedIn, StepStone, Indeed, Xing adapters** — not yet built (V1 sources are Greenhouse, Lever, Ashby, Personio).
- **Auto-apply mode** — not built. Current mode is review-only (user approves before submission).
- **Multiple profiles per user** — schema supports it, UI does not yet expose it.
- **Registration** — locked. Flip `allow_new_registrations` in DB when ready for public launch.

---

## Tech Stack Quick Reference

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Backend | Python 3.12, FastAPI |
| Database | PostgreSQL 16 |
| Storage | Cloudflare R2 |
| AI | OpenAI `gpt-4o-mini` (provider abstraction in place for future Claude/Gemini) |
| Automation | Playwright (stubbed, not yet implemented) |
| Scheduling | APScheduler |
| Hosting | Oracle Cloud VM (backend), Cloudflare Pages (frontend) |

---

## Ground Rules (Non-Negotiable)

1. **Industry standards by default** — mobile-first, accessibility, security, REST conventions. Claude calls out deviations before implementing.
2. **No Co-Authored-By in git commits.**
3. **Never commit `.env` or `.env.production`.**
4. **Human approval first** — no auto-apply without explicit user opt-in.
5. **Never invent profile data** in document generation — only reorder/rephrase.

---

## What's Next (Suggested)

- Page-by-page mobile polish (Scores, Opportunities, Resume pages most likely to need it)
- End-to-end test of AI scoring in production
- Playwright-based application assist (prefill ATS forms)
- Open registration when ready for beta users
