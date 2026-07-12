# Applaut — Project Progress

> **How to use this file**
> At the start of each session: "read PROGRESS.md and let's continue"
> At the end of each session: "save progress" — update this file and commit it

---

## 🎯 NEXT SESSION PRIMARY TASK

**Scale `backend/app/discovery/data/company_boards.json` from ~185 companies to 800-1,500+ companies.**

Everything needed to do this already exists and is proven working — this is a
data-sourcing/curation task, not an engineering task. See **"Discovery Scaling
— Phase 1"** below for full context, the exact numbers that justify this
target, and how to run the tooling.

Quick start for next session:
1. `cd C:\Projects\lvamo-applaut && docker compose up -d postgres backend` (rebuild if images were pruned)
2. Source more real company names — prefer web search against startup
   directories / "companies using Greenhouse/Lever" style lists over
   guessing from memory (memory-guessed batches hit ~29%; a properly sourced
   German-startup-directory batch still only hit ~14% because many funded
   startups are too early-stage to have a public ATS board — expect to need
   to source many more candidate names than the final company count).
3. `docker compose exec backend python scripts/discover_company_slugs.py --seed <new_seed_file>`
4. **`docker compose restart backend`** after any `company_boards.json` change — uvicorn's
   `--reload` only watches `.py` files, not the JSON data file, so the running
   server keeps a stale in-memory company list until restarted. Bit us twice
   this session — don't skip it before re-verifying counts.
5. Re-verify with a clean single-country test (see "How to verify" below).

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
**Or just run `bash deploy.sh`** on the VM — pulls, rebuilds, migrates, restarts, prunes. (Was broken by an unquoted `echo` edit that turned `>` into a stray redirect; fixed and back in sync with the committed version.)

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
- Adapter pattern — **7 adapters implemented: Greenhouse, Lever, Ashby, Personio, Workable, SmartRecruiters, Recruitee** (all public/no-auth JSON APIs — no browser scraping). Each verified against real live company data this session.
- Company list: `backend/app/discovery/companies.py` — `CURATED_BOARDS` (hand-picked, ~22 entries) + `ADAPTER_REGISTRY` (keyed by `source_name`) + auto-merged entries from `backend/app/discovery/data/company_boards.json` (currently **185 companies total**, up from 18 at the start of this session — see "Discovery Scaling — Phase 1" below). Dedupes automatically against curated entries.
- Offline company-slug discovery script: `backend/scripts/discover_company_slugs.py` — probes a seed list of company names against all 7 adapters' raw endpoints, keeps only slugs that resolve to a real non-empty job board, appends to `company_boards.json`. Seed files: `backend/scripts/seed_companies.txt` (general EU batch) and `backend/scripts/seed_companies_de.txt` (sourced from real German startup directories).
- Role matching (`app/discovery/location.py`'s `matches_roles`) now uses the same synonym expansion as scoring (shared table: `backend/app/core/role_synonyms.py`) — a title like "Analytics Engineer" is now fetched for a "Data Engineer" search, not silently dropped before scoring ever sees it.
- Concurrency-capped: `DISCOVERY_CONCURRENCY` (default 20, env-configurable) semaphore in `engine.py` so a large `COMPANY_BOARDS` doesn't burst-hammer any single ATS host.
- Scheduled via APScheduler (`backend/app/discovery/scheduler.py`)
- Location resolution: city → country code (`backend/app/discovery/location.py`)
- Manual trigger available via API — **and now auto-chains into rule-based scoring** (see Scoring section)

### Scoring
- **Rule-based scorer** (`backend/app/scoring/rule_based.py`):
  - 5 dimensions: role(35), skills(25), location(20), employment_type(10), experience(10)
  - Role synonym expansion (data engineer, devops, etc.)
  - Skills score uses JD keyword count as denominator (% of what job requires)
  - Re-scores ALL active opportunities on every run (upsert — no stale results)
  - Preserves user decisions across re-scoring runs
  - **Runs automatically after every discovery run** (`trigger_discovery` in `backend/app/services/opportunity.py` chains into `run_scoring`) — no separate "Run scoring" step needed
- **AI scorer** (`backend/app/scoring/ai_scorer.py`):
  - Uses `gpt-4o-mini` via `AsyncOpenAI`
  - Only scores previously-unscored opps (cost control)
  - Returns per-dimension explanations + near-miss keywords
  - **Gated in the UI** — "Scoring" dropdown on Opportunities page shows AI as disabled/greyed ("premium — coming soon"); wired up for a future subscription model, not user-selectable yet
- Near-miss gap analysis: keywords the user lacks, suitability assessment
- User decisions on near-misses: keep / dismiss / keep_with_keywords — actionable inline from the Opportunities page (see UI section)

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
- Fixed: bell was calling `/notifications` instead of `/api/v1/notifications` (404 on every page) — all four endpoints in `frontend/src/api/notifications.ts` now correctly prefixed

### Audit Log
- Every major action logged to `audit_logs` table
- Viewable in AuditLog page (`/audit`)

### UI
- Dark futuristic theme with CSS custom properties (design tokens)
- Inter font via Google Fonts
- Custom SVG favicon (geometric "A" mark)
- **Mobile-responsive**: slide-in sidebar with backdrop on ≤768px, fixed top bar with hamburger
- **Opportunities + Scores merged into one page** (`frontend/src/pages/Opportunities.tsx`) — the standalone Scores page is gone. Running discovery auto-scores; each card shows its score badge, per-dimension chips (hover for explanation), and near-miss gap keywords + keep/dismiss actions inline, or good-match actions (generate documents / start application) inline. Filters: Match (all/good/near-miss/below/unscored), Source, Country, Scoring mode (Rule-based; AI shown disabled). `/scores` route redirects to `/opportunities`; `?match=` query param supported for deep links from Dashboard
- Pages: Landing, Login, Register, Onboarding, Dashboard, Opportunities, Applications, Resume, AuditLog, OpportunityDetail, DocumentDetail

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

## Discovery Scaling — Phase 1 (In Progress, Not Committed)

**Goal (user-stated):** a single discovery run should return 100-200 raw job
listings with 50+ scoring as "good matches," for a realistic profile (multiple
target roles matching one tech stack, at least 1 target country).

**Status: code complete and verified working; company density insufficient
for single-country searches.** All code changes are uncommitted in the
working tree (`git status` shows modified/untracked files) — nothing was
pushed or deployed this session, unlike prior sessions. Confirm with the user
before committing/deploying.

### What was built (all verified against live data via local docker-compose)
1. Closed a gap where `matches_roles` (discovery-time filter) only did literal
   substring matching while the scorer already had synonym expansion — jobs
   titled e.g. "Analytics Engineer" were being silently dropped before
   scoring ever saw them for a "Data Engineer" search. Fixed by extracting
   the synonym table to `app/core/role_synonyms.py`, shared by both.
2. Added an `asyncio.Semaphore` concurrency cap to the discovery engine.
3. Built and verified 3 new ATS adapters (Workable, SmartRecruiters,
   Recruitee) — each confirmed against a real company with real matching
   jobs, not just a 200-OK response.
4. Built `backend/scripts/discover_company_slugs.py` — an offline batch
   script that probes candidate company-name slug variants against all 7
   adapters and keeps only ones that resolve to a real non-empty job board.
   Output → `backend/app/discovery/data/company_boards.json`, merged into
   `COMPANY_BOARDS` at runtime, deduped against the hand-curated list.
5. Ran the script across ~660 seed company names in 4 batches (general EU
   guesses, a broader/gaming-and-marketplace batch, and a batch sourced from
   real German startup-directory web pages) → **185 companies found and
   verified live**, up from 18.

### The honest numbers (clean tests, wiped DB between runs)

| Test profile | Companies | Countries | Roles | Raw results | Good matches |
|---|---|---|---|---|---|
| User's exact scenario (Data Engineer + 6 tech-stack-adjacent roles) | 185 | Germany only | 7 | **18** | 3 (@ threshold 85) |
| Broader realistic profile | 185 | 8 EU countries | 5 | **575** | 13 (@85) / 230 (@70) |

**Conclusion:** the 100-200/50+ target is easily hit for multi-country
searches today. It is **not yet hit for single-country searches** — Germany
alone only surfaces 18 raw postings even with 185 companies in the pool,
because most of the current company pool is Dutch/pan-EU-remote rather than
Germany-specific. Growing 169→185 companies (+9%) grew raw Germany results
14→18 (+28%), a better-than-linear trend — but extrapolating it suggests
**~800-1,500 companies** are needed for single-country search to reliably hit
the target on its own. This is the next session's primary task (see banner
at top of this file).

**Sourcing note:** memory-guessed company batches hit ~29% (script finds a
working slug). A batch sourced from real German-startup-directory web pages
still only hit ~14%, because many funded early-stage startups don't have a
public ATS board yet. Expect to need several hundred *candidate* names to
net a few hundred *working* companies — budget for that ratio.

### How to verify (clean single-country test recipe)
Test/user account from this session still exists in the local dev DB:
`verify2@test.com` / `TestPass123!`, profile already has target_roles set to
the "Data Engineer + 6 tech-stack roles" scenario. To re-run cleanly:
```bash
# wipe accumulated opportunities so results reflect only the current company pool
docker compose exec -T postgres psql -U applaut -d applaut -c "TRUNCATE opportunities, scores CASCADE;"
# log in, get a fresh token (prior token may have expired)
curl -s -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"verify2@test.com","password":"TestPass123!"}'
# run discovery — new_jobs_found IS the clean raw-result count right after a truncate
curl -s -X POST http://localhost:8000/api/v1/discovery/run -H "Authorization: Bearer <token>"
# breakdown by match category
curl -s "http://localhost:8000/api/v1/opportunities?match=good&page_size=1" -H "Authorization: Bearer <token>"
```
If testing country/role breadth, `PATCH /api/v1/profiles/me` with new
`target_roles` / `target_countries` first — but re-truncate between tests, or
`scored` in the discovery response will reflect the whole accumulated pool
from prior tests, not just the current profile's matches (this tripped us up
mid-session).

### Also fixed this session
- Notification bell — see UI/Notifications section above (already committed).
- `deploy.sh` on the VM had an uncommitted quoting bug — see Deployment
  section above (already committed and deployed).

---

## Known Issues / Deferred Work

- **Discovery company density** — see "Discovery Scaling — Phase 1" above. Single-country searches need ~800-1,500 companies to hit the 100-200 raw-results target; currently at 185.
- **Individual page mobile polish** — Layout is now responsive, but page-level content (cards, grids, tables) may still need padding/sizing tweaks on small screens. Not yet reviewed page-by-page.
- **AI scoring** — implemented but intentionally gated off in the UI (disabled dropdown option) pending the subscription/premium model. Not user-reachable right now.
- **Workday, LinkedIn, StepStone, Indeed, Xing, Teamtailor** — not yet built. Teamtailor investigated and rejected for the current adapter pattern (requires a per-company API key, doesn't fit the public-JSON model). Workday investigated and deferred ("Phase 1.5") — real endpoint exists but needs a heavier per-company probing strategy (subdomain + datacenter number + tenant/site, not a single guessable slug).
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

- **Scale company_boards.json to 800-1,500 companies** (see banner at top — primary task for next session)
- Commit + deploy this session's discovery-scaling work once company density is closer to target (or sooner, if the user wants incremental deploys)
- Page-by-page mobile polish (Opportunities, Resume pages most likely to need it)
- Subscription/premium model to unlock AI scoring in the UI
- Playwright-based application assist (prefill ATS forms)
- Open registration when ready for beta users
