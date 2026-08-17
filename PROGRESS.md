# Applaut — Project Progress

> **How to use this file**
> At the start of each session: "read PROGRESS.md and let's continue"
> At the end of each session: "save progress" — update this file and commit it

---

## ✅ Oracle backend migration COMPLETE — `lvamo-backend` is live

Backend fully migrated from the old `applaut-backend` VM (deleted) to the
new `lvamo-backend` Ampere A1.Flex instance. `api.applaut.lvamo.com` is live
again, verified end-to-end (frontend login → DNS → TLS → nginx → backend →
DB, all through the new server). Full write-up, including the ~22.5h
capacity wait, the PAYG upgrade, the DNS/Cloudflare cutover, and everything
that had to be replicated on the new box, is under "Oracle Backend
Migration" below — kept for reference, not because anything is still
pending. **The "scaling company_boards.json" task is the priority again.**

---

## 🎯 NEXT SESSION PRIMARY TASK (paused — see banner above)

**Keep scaling `backend/app/discovery/data/company_boards.json` — now at 500 companies, single-country density still below target. A proven sourcing method exists — use it.**

**This session found a working method.** Two failed/weak approaches first:
memory-guessing (790 candidates → 144 new, most already tried) and VC
portfolio pages (280 candidates → 26 hits, but +24 companies moved raw jobs
by 0 — skewed toward early-stage startups with no open data reqs). Then the
one that worked: **search for live target-role job postings already sitting
on the 7 supported ATS domains** (e.g. `site:jobs.personio.de "data
engineer"`, `site:boards.greenhouse.io "data engineer" Berlin`) — this
pre-qualifies a candidate as both "has a board on a supported adapter" and
"actively hiring for a target role" at once. Result: 34 candidates → 14 hits
(41%), and Germany raw jobs actually moved: 33 → 39 from just 14 companies.
**Use this method by default going forward** — see "Discovery Scaling —
Phase 1" below for the full write-up and the exact query pattern.

Quick start for next session:
1. `cd C:\Projects\lvamo-applaut && docker compose up -d postgres backend` (rebuild if images were pruned)
2. Search `site:<ats-domain> "<target role>" <German city>` across all 7
   adapter domains × the target role list × major German cities (see
   "Discovery Scaling — Phase 1" for the full method and domain list). Skip
   memory-guessing and VC-portfolio pages — both underperformed this method.
3. `docker compose exec backend python scripts/discover_company_slugs.py --seed <new_seed_file>`
4. **`docker compose restart backend`** after any `company_boards.json` change — uvicorn's
   `--reload` only watches `.py` files, not the JSON data file, so the running
   server keeps a stale in-memory company list until restarted. Bit us twice
   this session — don't skip it before re-verifying counts.
5. Re-verify with a clean single-country test (see "How to verify" below) —
   and pay attention to whether raw job count actually moves, not just
   company count.

---

## Deployment

| Layer | Status | URL / Location |
|---|---|---|
| Frontend | Live | `www.lvamo.com` (Cloudflare Pages, auto-deploys on push to `main`) — root `/` is now the **LVAMO hub** (lists verticals: Applaut at `/applaut/*`, Jobref placeholder at `/jobref`), not Applaut directly. All of Applaut's pages (login, dashboard, opportunities, etc.) live under `/applaut/*` now, not at the frontend root. |
| Backend API | Live | `api.applaut.lvamo.com` (Oracle Cloud VM `lvamo-backend`, `130.61.106.172`, Ampere A1.Flex, 4 OCPU/24GB, Docker) — verified end-to-end post-migration (health, auth, and a real browser login all confirmed working through nginx+TLS). Endpoints still mounted under `/api/v1/applaut/*`. |
| Database | Live | PostgreSQL 16 in Docker on the new VM — restored from the pre-migration backup, row counts verified to match. |
| Storage | Configured | Cloudflare R2 (resumes, documents) |

**VM access:** `ssh -i C:\Users\vvenk\Downloads\ssh-key-2026-07-10.key ubuntu@130.61.106.172`
**Old VM (`applaut-backend`, `130.61.65.131`):** deleted as part of the migration — do not use.
**App dir on VM:** `/home/ubuntu/lvamo-applaut/`
**Deploy backend:** `sudo docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build backend`
**Or just run `bash deploy.sh`** on the VM — pulls, rebuilds, migrates, restarts, prunes.
**OCI API access is set up** (Python SDK + API key at `~/.oci/config` on the dev machine) — instance create/terminate/resize no longer needs manual Console clicks; see migration section below for the one-time setup.
**Cloudflare API access is set up** too (scoped token, `lvamo.com` zone, DNS edit only, saved at `~/.cloudflare/token` on the dev machine) — DNS record changes for this domain no longer need the dashboard either.
**⚠️ `nginx` gotcha**: if the VM is ever rebooted, `nginx`'s `restart: always` policy will bring it back even if it was manually `docker stop`ped before — a host reboot resets Docker's memory of that. Not a problem now (cert exists, nginx starts fine), just worth knowing if this ever needs debugging again.

---

## Oracle Backend Migration (COMPLETE)

**Why:** the old VM (OCI display name `applaut-backend`, `130.61.65.131`) was
a **fixed** `VM.Standard.E2.1.Micro` shape — 1 OCPU / 1GB RAM, not resizable,
already down to ~250MB free RAM with just Applaut running (no room for
Jobref later). Moved to Oracle's Ampere A1.Flex tier instead — started the
launch attempt at 2 OCPU/12GB (Oracle's free Ampere allotment had just been
reduced from the historical 4 OCPU/24GB — noted 2026-08 via an Oracle
console banner), ended up at the full **4 OCPU / 24GB** after the account
was upgraded to Pay-As-You-Go mid-migration (see step 7 — still $0, Always
Free entitlements stay free on PAYG). New instance name: `lvamo-backend`
(generic, not vertical-specific, per this session's URL-namespacing theme).
**Total elapsed time: ~24 hours, almost all of it waiting on Oracle capacity,
not active work.**

**Sequencing note:** the user explicitly chose to delete the old instance
*before* creating the new one (not a side-by-side blue-green migration) —
so there is no rollback safety net, only the backup below. This was a
known, accepted trade-off, not an accident.

### What's done
1. ✅ **Backed up** from the old VM before deletion, verified good:
   - `C:\Projects\lvamo-applaut\.deploy-backup\applaut_backup.dump` — full
     `pg_dump -Fc` of the `applaut` database (70,875 bytes). Verified via
     `pg_restore --list` — all 11 tables present (`users`, `profiles`,
     `resumes`, `opportunities`, `scores`, `applications`,
     `generated_documents`, `notifications`, `audit_logs`,
     `application_settings`, `alembic_version`).
   - `C:\Projects\lvamo-applaut\.deploy-backup\.env.production` — exact
     byte-for-byte copy of the old VM's secrets/config (791 bytes).
   - Both gitignored (`.deploy-backup/` added to `.gitignore`), never
     committed.
2. ✅ **Audited the old VM's full live config** before deletion (not just
   what's in git) so the new one can be a faithful rebuild:
   - Docker installed via **`apt install docker.io docker-compose-plugin
     docker-buildx-plugin`** (Ubuntu's own repo, NOT Docker's official CE
     repo/get.docker.com script).
   - `certbot` + `python3-certbot` via apt (classic, not snap) — ships its
     own `certbot.timer` systemd unit for auto-renewal, enabled by default
     on install, don't need to set that up manually.
   - Cert: standalone HTTP-01 authenticator, standard Let's Encrypt prod
     server, for `api.applaut.lvamo.com` only.
   - Host firewall: Oracle's Ubuntu cloud image ships iptables with a
     default-REJECT policy after allowing established/related/ICMP/SSH —
     ports 80 and 443 were opened via `iptables -I INPUT <pos> -m state
     --state NEW -p tcp --dport {80,443} -j ACCEPT`, then persisted via
     `apt install -y iptables-persistent && netfilter-persistent save`.
     Must redo this on the new box — a fresh Ubuntu 24.04 image will have
     the same default-REJECT baseline.
   - No swap configured (wasn't needed even at 1GB RAM previously; even
     less needed at 12GB). No custom `/etc/docker/daemon.json`. No crontab
     entries. Nothing manually added to the repo dir outside git except
     `.env.production` (confirmed via `git status --ignored`).
3. ✅ **OCI API access set up** (this is durable, reusable going forward —
   not just for this migration):
   - OCI Python SDK installed locally (`pip install --user oci`) — the
     full `oci-cli` package **fails to install** on this machine (Python
     3.14 is too new for PyYAML's prebuilt wheels, and there's no MSVC
     build toolchain to compile it from source) — use the raw SDK via
     Python scripts instead, not the CLI.
   - API signing key pair generated at `~/.oci/oci_api_key.pem` (private)
     / `~/.oci/oci_api_key_public.pem` (public), registered against the
     user's OCI account (Console → Profile → API Keys). Config at
     `~/.oci/config`.
   - **Known gotcha**: right after adding a new API key, the Identity
     service authenticates instantly, but Compute/Network ("iaas")
     endpoints can take several minutes to see the new key — expect
     transient `401 NotAuthenticated` on `ComputeClient` calls for a few
     minutes after first setup even though `IdentityClient` calls succeed
     immediately. Not a real problem, just wait and retry.
4. ✅ Old instance **terminated** (`preserve_boot_volume=False` — no
   orphaned boot volume left eating into the shared 200GB free block
   storage allowance).
5. ✅ **Instance launched** — after ~22.5 hours of retrying (a 5-min cron
   job checking `attempt_launch_once.py`), succeeded on AD-1:
   `RWGt:EU-FRANKFURT-1-AD-1`, instance OCID
   `ocid1.instance.oc1.eu-frankfurt-1.antheljr7fvjruaci7an2vityonovsx6dhyqobw2xf7zmfop3evimbuqrpyq`,
   public IP **`130.61.106.172`**. Confirmed `RUNNING`, correct image
   (Ubuntu 24.04.4 LTS aarch64), SSH working immediately with the existing
   key — no new credentials needed. Full retry-attempt history logged at
   `C:\Projects\lvamo-applaut\.deploy-backup\launch_attempts.log`.

   Journey to get here, for reference — tried multiple angles, all hit the
   same wall until it finally cleared:
   - API `launch_instance` for `VM.Standard.A1.Flex` (2 OCPU/12GB) failed
     `500 Out of host capacity` across all 3 ADs in `eu-frankfurt-1`
     (`RWGt:EU-FRANKFURT-1-AD-1/2/3`), repeatedly, for hours.
   - User also tried creating it **manually via the OCI Console** — same
     result, same capacity wall (confirmed it was real infra capacity, not a
     bug in the API calls).
   - Investigated whether another OCI **region** might have capacity: **not
     an option for staying free** — Always Free compute is only provisionable
     in the tenancy's home region, which is locked to `eu-frankfurt-1` and
     can't be changed after signup ([Oracle docs](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)).
     Confirmed via `list_region_subscriptions`. A brand-new account in a
     different region (e.g. Singapore, anecdotally easier per community
     reports) was considered but the user opted not to pursue it — flagged
     risk: Oracle generally allows one Always Free account per
     identity/card, and a second account created to route around this
     would risk suspension. **Decision: stick with this tenancy, keep
     retrying Frankfurt.**
   - Background retry loop ran every 5 min per full cycle (15s stagger
     between the 3 ADs — an earlier tighter loop hit `429 Too many
     requests` and was replaced with this slower pacing). Script:
     `/tmp/retry_launch.py` on the dev machine (not the VM).
   - **Bug hit and fixed along the way**: the loop initially only caught
     `oci.exceptions.ServiceError`, so a transient network blip (DNS
     resolution failure, e.g. laptop sleep/wifi drop) raised an uncaught
     `oci.exceptions.RequestException` and silently killed the whole loop —
     it sat dead for a while before anyone noticed. Fixed with a catch-all
     `except Exception` around the launch call. **If a retry script like
     this is ever needed again, keep that catch-all** — it's the difference
     between "retries for hours unattended" and "dies on the first hiccup."
   - Eventually switched from an in-session background loop to a `CronCreate`
     recurring job (5 min interval) calling an idempotent
     `attempt_launch_once.py` (checks first whether `lvamo-backend` already
     exists in a live state before attempting anything) — this proved more
     durable across session boundaries than the plain background process.
6. ✅ **Provisioned** — replicated the audited old-VM config on the new box:
   - Docker packages differ by Ubuntu version: old box (20.04) used
     `docker.io docker-compose-plugin docker-buildx-plugin`; new box (24.04)
     needed **`docker.io docker-compose-v2 docker-buildx`** instead — apt
     aborts the whole install line if any package name is wrong, so this
     needs fixing before anything else installs.
   - iptables: fresh Ubuntu 24.04 image has the identical default-REJECT
     baseline as the old 20.04 one — opened 80/443 the same way, persisted
     with `netfilter-persistent save`.
   - certbot via apt as before — `certbot.timer` auto-enabled.
   - Repo cloned, `.env.production` + DB dump `scp`'d up from the local
     backup, `postgres` brought up first and the dump restored via
     `pg_restore` inside the container before starting anything else —
     verified row counts matched the backup (2 users, 2 profiles, 12
     opportunities).
   - `backend` built and started cleanly on ARM64 — all Python dependencies
     in `requirements.txt` had prebuilt `aarch64` wheels, no compile-from-
     source issues.
   - Alembic migrations ran clean (no-op, DB was already at head from the
     restored dump).
   - Validated the backend directly, bypassing `nginx` (chicken-and-egg:
     `nginx`'s config requires a TLS cert that can't be issued until DNS
     points here) — the `python:3.12-slim` image has no `curl`, so used
     `python3 -c "import urllib.request..."` inside the container instead.
     Health, a bad-login 401, and an unauthenticated-access 403 all came
     back correct.
7. ✅ **Account upgraded to Pay-As-You-Go mid-migration** — almost certainly
   *why* the ~22.5h capacity wait finally succeeded (PAYG gets priority
   capacity access even for Always-Free-eligible shapes). User then resized
   the instance up to the *full* Always-Free Ampere allotment (4 OCPU/24GB,
   still $0) and rebooted. Verified clean afterward: same public IP, shape
   confirmed 4 OCPU/24GB at both the OCI API and OS level (`nproc`=4,
   `free -h`=23Gi), Docker daemon active, `backend`+`postgres` survived
   the reboot and stayed healthy, iptables rules persisted. Only `nginx`
   needed re-stopping (a full host reboot resets Docker's memory of a
   manual `docker stop`, unlike a daemon-only restart — it came back into
   its crash loop and had to be stopped again).
8. ✅ **Cloudflare API access set up** (durable, same pattern as OCI) —
   scoped API Token (Zone → DNS → Edit, restricted to the `lvamo.com` zone
   only, no other-zone/billing access), created via the dashboard
   (**dash.cloudflare.com/profile/api-tokens** → Create Token → "Edit zone
   DNS" template), saved locally at `~/.cloudflare/token`. Verified via
   `GET /client/v4/user/tokens/verify` before use.
9. ✅ **DNS cutover** — updated the `api.applaut.lvamo.com` A record (zone
   `fb08020e0634c5add91336af3cb709f6`, record
   `34df1e922eeeb9157a21bd432b8fcf49`) via `PATCH
   /client/v4/zones/{zone}/dns_records/{id}` from `130.61.65.131` (dead) to
   `130.61.106.172`. Propagated within seconds (it's a DNS-only/grey-cloud
   record on Cloudflare, so no proxy cache to wait on).
10. ✅ **Cert issued**: `certbot certonly --standalone -d
    api.applaut.lvamo.com` — succeeded immediately once DNS pointed here.
    Expires 2026-11-15, auto-renewal via `certbot.timer` already confirmed
    enabled. `nginx` started clean.
11. ✅ **Full end-to-end verification**: health check over HTTPS through
    nginx, real login attempt against a real production account (wrong
    password, confirmed proper 401 not a crash), and a full Playwright
    browser pass against `https://www.lvamo.com/applaut/login` — frontend →
    DNS → TLS → nginx → backend → DB, all through the new server, all
    correct.

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
- Adapter pattern — **7 adapters implemented: Greenhouse, Lever, Ashby, Personio, Workable, SmartRecruiters, Recruitee** (all public/no-auth JSON APIs — no browser scraping). Personio's endpoint had gone dead (retired JSON API) and was fixed this session — see "Discovery Scaling" below.
- Company list: `backend/app/discovery/companies.py` — `CURATED_BOARDS` (hand-picked, ~22 entries) + `ADAPTER_REGISTRY` (keyed by `source_name`) + auto-merged entries from `backend/app/discovery/data/company_boards.json` (currently **500 companies total**, up from 18 at the start of the scaling effort — see "Discovery Scaling — Phase 1" below). Dedupes automatically against curated entries.
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
- **Opportunities + Scores merged into one page** (`frontend/src/pages/Opportunities.tsx`) — the standalone Scores page is gone. Running discovery auto-scores; each card shows its score badge, per-dimension chips (hover for explanation), and near-miss gap keywords + keep/dismiss actions inline, or good-match actions (generate documents / start application) inline. Filters: Match (all/good/near-miss/below/unscored), Source, Country, Scoring mode (Rule-based; AI shown disabled). `/applaut/scores` route redirects to `/applaut/opportunities`; `?match=` query param supported for deep links from Dashboard
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

## Multi-Vertical URL Namespacing (Committed)

LVAMO is now explicitly a multi-vertical platform: Applaut (live) and Jobref
(placeholder, see UI section above). This session namespaced every
Applaut-owned URL — frontend pages and backend API — under `applaut`, so a
future Jobref backend/login can get its own namespace without colliding.

- **Frontend**: all of Applaut's pages (`login`, `register`, `onboarding`,
  `dashboard`, `opportunities`, `resume`, `applications`, `audit`,
  `documents/:id`) moved from the root to `/applaut/*`. `Jobref` was pulled
  out from under Applaut's `Layout` entirely — it now uses a small shared
  `frontend/src/components/BrandedPage.tsx` shell instead, so it has zero
  dependency on Applaut's routing/sidebar/auth code.
- **Backend**: `app.main` mounts the v1 router at `/api/v1/applaut` (was
  `/api/v1`) — single-line change in `backend/app/main.py`. Every endpoint
  path is otherwise unchanged, just prefixed.
- **localStorage token key** renamed `access_token` → `applaut_access_token`
  (in `frontend/src/api/client.ts`) so a future Jobref session can't collide
  with Applaut's.
- **Hostnames unchanged** — `www.lvamo.com` and `api.applaut.lvamo.com` stay
  as-is; only URL *paths* changed. Renaming the API subdomain (e.g. to
  `api.lvamo.com/applaut/*`) is a deliberately deferred DNS/TLS decision, not
  done here.

**Bug found + fixed along the way**: while tracing every API call site for
this rename, found that `frontend/src/api/applications.ts`, `audit.ts`,
`scheduler.ts`, and `stats.ts` were calling bare paths with no `/api/v1`
prefix at all — no rewriting interceptor and no path-rewriting nginx rule
compensating, so **Applications, Audit Log, Dashboard stats, and the
discovery scheduler toggle were silently 404ing in production** before this
session. Fixed as part of centralizing the API base URL (see below) — all
four now confirmed working end-to-end via Playwright against real data
(48 jobs / 2 good / 32 near-miss, 34 audit events) both locally and against
the live production API after deploy.

`frontend/src/api/client.ts` now bakes `/api/v1/applaut` into the axios
`baseURL` instead of repeating it per call site (root cause of the above
inconsistency) — every `src/api/*.ts` module calls resource-relative paths
now (e.g. `/opportunities`, not `/api/v1/opportunities`).

Deployed to production same session: backend rebuilt/restarted on the Oracle
VM via `deploy.sh` (backend first, then frontend push, to minimize the gap
where a live frontend could hit a since-moved backend), frontend
auto-deployed via Cloudflare Pages push. Both verified live post-deploy.

---

## Discovery Scaling — Phase 1 (In Progress, Committed)

**Goal (user-stated):** a single discovery run should return 100-200 raw job
listings with 50+ scoring as "good matches," for a realistic profile (multiple
target roles matching one tech stack, at least 1 target country).

**Status: code complete and verified working; company density still
insufficient for single-country searches, but meaningfully better.**

### Session update — Personio adapter fix (committed `efe3a95`)
Personio had quietly retired its `/api/v1/jobs` JSON endpoint (now 404s,
replaced by a client-rendered SPA). The adapter and the probing script were
both silently finding 0 Personio hits as a result. Fixed by switching to
Personio's legacy `/xml` feed (their "workzag-jobs" format), which is still
public and no-auth. This alone unlocked **201 new companies** — many of them
large German corporates (BASF, Bosch, Siemens, Continental, Deutsche Bank,
etc.) — sourced via a new seed list, `backend/scripts/seed_companies_de2.txt`
(1,397 candidate names: funded German startups + Mittelstand/industrial
companies + DAX/MDAX corporates + cybersecurity/software companies).
Board went **171 → 437 companies**.

`discover_company_slugs.py` gained a `--adapters` flag so old seed lists can
be cheaply re-probed against just Personio now that it works, instead of
re-running the full 7-adapter sweep.

**Re-verified with the clean Germany-only test** (see "How to verify"
below): raw job count **18 → 34**, no errors. Real progress — but the growth
is **sub-linear**: companies grew 2.4x (185→437) while jobs grew only 1.9x
(18→34), worse than the earlier "better-than-linear" trend that had been
extrapolated from a smaller sample (169→185 companies, +9%, drove 14→18 jobs,
+28%). Good-match count actually dipped slightly (3→2 @ threshold 85) while
near-misses jumped to 20 — more relevant-ish jobs are surfacing, just
scoring just under threshold. Small sample; not a red flag on its own.

**Revised extrapolation:** using all three data points (169→14, 185→18,
437→34), hitting the 100-200 raw-result target now looks like it needs
**~1,800-2,000 companies**, not the 800-1,500 estimated last session. Treat
this as a rough guide, not a hard target — re-extrapolate again after the
next batch.

### Session update — VC-portfolio batch (committed `90eb89b`) + a strategic finding

Kept sourcing toward the ~2,000 target, Germany-only per user request.
Memory-guessing hit a wall fast: generated ~790 candidate names from
memory across fintech/insurtech/healthtech/climate/mobility categories,
deduped against all prior seed files (2,290 already-tried names) — only
**144 were genuinely new**. Most of what's memorable from training data was
already sourced last session.

Switched to fetching real VC portfolio pages (Earlybird, HTGF, HV Capital,
Project A) via WebFetch — a different, less memory-biased source. Combined
batch: 280 deduped candidates → **26 new companies** (9.3% hit rate).
Board: 437 → **461**.

**Re-verified — and this is the important part:** Germany-only raw jobs came
back essentially flat: **33 raw / 2 good / 20 near-miss**, vs. 34/2/20
before this batch. Adding 24 companies (+5.5%) moved raw jobs by 0.

**Strategic takeaway:** company *count* alone is not what's driving raw job
volume — company *type* is. The VC-portfolio batch skewed toward
early/seed-stage startups, which typically have 0-1 open reqs at any given
time and often none in data engineering specifically. The Personio batch
(prior session update, +266 companies, 18→34 raw) worked because it happened
to include large, engineering-heavy German corporates (BASF, Bosch, Siemens,
Continental, Deutsche Bank, etc.) with sustained hiring pipelines — not
because it was large. The ~1,800-2,000 extrapolation above assumes company
mix stays constant; it likely overstates what's needed if sourcing gets more
targeted, and understates it if sourcing stays skewed toward small startups.

### Session update — job-posting-targeted sourcing (committed `35dc554`) — this is the method to keep using

Flipped the sourcing strategy again, and this one confirmed the hypothesis
directly. Instead of guessing company names and checking whether they have
*any* board, searched the web for live "data engineer" / "data platform
engineer" / "ETL developer" / etc. postings already sitting on our 7
supported ATS platforms in Germany (e.g. `site:jobs.personio.de "data
engineer"`, `site:boards.greenhouse.io "data engineer" Berlin`). This
pre-qualifies a candidate on **both** axes at once — has a board on a
supported adapter, *and* is actively hiring for a target role right now —
instead of just the first one.

Result: 34 candidates → **14 hits (41% hit rate)**, vs. 9.3% for the
VC-portfolio batch and far above blind memory-guessing. Board: 461 → **475**.
Re-verified: Germany raw jobs **33 → 39 (+6 from just 14 companies)** — a
real per-company lift, vs. the VC-portfolio batch's +24 companies → +0 jobs.

**This confirms the strategic finding and gives a concrete, repeatable
method: search `site:<ats-domain> "<target role>" Germany/Berlin/Munich/...`
across all 7 adapter domains (`boards.greenhouse.io`, `jobs.lever.co`,
`jobs.ashbyhq.com`, `jobs.personio.de`, `apply.workable.com`,
`jobs.smartrecruiters.com`, `jobs.recruitee.com`) crossed with the target
role list (Data Engineer, ETL Developer, Python Developer, SQL Developer,
PySpark Developer, Data Platform Engineer, Databricks Developer) and major
German cities. This is now the default sourcing method — prefer it over
VC-portfolio pages or memory-guessing.** It naturally self-limits (you run
out of distinct search-result pages per query), so expect to need many query
variants (role × city × adapter combinations) to keep finding fresh hits,
and to re-run periodically since job postings churn (today's non-match may
be hiring next month).

Two more rounds applied the same session (committed `974da97`): more role
variants (ETL, Python Developer, Databricks, data warehouse, SQL developer)
× more cities (Munich, Hamburg, Frankfurt, Stuttgart, Cologne, Leipzig,
Dresden, Nuremberg, Karlsruhe). 57 candidates → **19 hits (59% hit rate)** —
even better than the first round, likely because later queries increasingly
hit companies with several open roles/cities generating multiple distinct
search hits pointing at the same still-new company. Board: 475 → **494**.
Re-verified: Germany raw jobs **39 → 47** (+8 from 19 companies).

One final round (committed `7b120e9`): Databricks/PySpark role variants +
remaining adapter/city gaps. 11 candidates → 6 hits (55%). Notable find:
**Statista** (Hamburg-based, well-known, multiple open data-engineering
roles on Ashby — the first solid Ashby hit this session). Board: 494 → 500.
Re-verified: Germany raw jobs 47 → 48.

**Session total: 171 → 500 companies (2.9x), Germany raw jobs 18 → 48
(2.7x), good matches steady at 2 (@85 threshold), near-misses climbed to
32.** Diminishing but still real returns each round — the method keeps
working, it just takes more query variants each time to find fresh,
not-already-tried candidates. 6 seed files now exist
(`seed_companies_de.txt` through `_de6.txt`); future sessions should keep
appending `_de7.txt` etc. rather than reusing a name, since the probe
script's dedup is against `company_boards.json` slugs, not seed file
names — re-running an old file just wastes requests re-probing misses.

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
| User's exact scenario, after Personio fix | 437 | Germany only | 7 | **34** | 2 (@85), 20 near-misses |
| Same, after VC-portfolio batch (weak) | 461 | Germany only | 7 | **33** | 2 (@85), 20 near-misses |
| Same, after job-posting-targeted batch (strong) | 475 | Germany only | 7 | **39** | 2 (@85), 24 near-misses |
| Same, after 2 more targeted rounds | 494 | Germany only | 7 | **47** | 2 (@85), 31 near-misses |
| Same, after final targeted round (session end) | 500 | Germany only | 7 | **48** | 2 (@85), 32 near-misses |

**Conclusion:** the 100-200/50+ target is easily hit for multi-country
searches today. It is **not yet hit for single-country searches** — Germany
raw results roughly doubled (18→34) after the Personio adapter fix added 266
companies (171→437), but the growth is **sub-linear**: companies grew 2.4x
while jobs grew only 1.9x — worse than the earlier 169→185 data point
suggested. Re-extrapolating from all three data points now suggests
**~1,800-2,000 companies** are needed for single-country search to reliably
hit the target on its own (revised up from the earlier 800-1,500 estimate,
which was based on a smaller, noisier sample). This is still the next
session's primary task (see banner at top of this file).

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
curl -s -X POST http://localhost:8000/api/v1/applaut/auth/login -H "Content-Type: application/json" \
  -d '{"email":"verify2@test.com","password":"TestPass123!"}'
# run discovery — new_jobs_found IS the clean raw-result count right after a truncate
curl -s -X POST http://localhost:8000/api/v1/applaut/discovery/run -H "Authorization: Bearer <token>"
# breakdown by match category
curl -s "http://localhost:8000/api/v1/applaut/opportunities?match=good&page_size=1" -H "Authorization: Bearer <token>"
```
(All API paths now live under `/api/v1/applaut/*`, not `/api/v1/*` — see
"URL namespacing" below.) If testing country/role breadth, `PATCH
/api/v1/applaut/profiles/me` with new
`target_roles` / `target_countries` first — but re-truncate between tests, or
`scored` in the discovery response will reflect the whole accumulated pool
from prior tests, not just the current profile's matches (this tripped us up
mid-session).

### Also fixed
- Notification bell — see UI/Notifications section above (already committed).
- `deploy.sh` on the VM had an uncommitted quoting bug — see Deployment
  section above (already committed and deployed).
- Personio adapter (dead JSON endpoint → live XML feed) — see session update
  above (committed `efe3a95`, deployed).

---

## Known Issues / Deferred Work

- **Discovery company density** — see "Discovery Scaling — Phase 1" above. A working sourcing method now exists (search for live target-role postings on the supported ATS domains — 41-59% hit rate, and raw jobs actually move). Currently at 500 companies, Germany raw jobs at 48 (up from 18 at session start). Keep applying the method — still short of the 100-200 raw-result target.
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

- **Keep scaling company_boards.json using the job-posting-targeted search method** (see banner at top — primary task for next session)
- Page-by-page mobile polish (Opportunities, Resume pages most likely to need it)
- Subscription/premium model to unlock AI scoring in the UI
- Playwright-based application assist (prefill ATS forms)
- Open registration when ready for beta users
