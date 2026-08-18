# LVAMO — Master Progress

> **How to use this file**
> This is the **platform-level** file — shared infra, cross-vertical
> architecture, and ground rules. Vertical-specific work (features, DB
> schema, roadmap) lives in its own file: `PROGRESS_APPLAUT.md`,
> `PROGRESS_JOBREF.md`.
>
> At the start of a session: read **this file first**, then whichever
> vertical file(s) are relevant to the work at hand.
> At the end of a session: "save progress" — update this file if anything
> platform-level changed, and/or the relevant vertical file(s), then commit.

---

## Verticals

| Vertical | Status | Progress file |
|---|---|---|
| **Applaut** | Live, in active development | [`PROGRESS_APPLAUT.md`](PROGRESS_APPLAUT.md) — primary task: keep scaling `company_boards.json` |
| **Jobref** | Login/registration built, verified locally, not yet deployed | [`PROGRESS_JOBREF.md`](PROGRESS_JOBREF.md) |

---

## Deployment

| Layer | Status | URL / Location |
|---|---|---|
| Frontend | Live (Jobref auth pages built, pending redeploy) | `www.lvamo.com` (Cloudflare Pages, auto-deploys on push to `main`) — root `/` is the **LVAMO hub** (`frontend/src/pages/Hub.tsx`), listing verticals: Applaut at `/applaut/*`, Jobref at `/jobref/*` (landing, login, register, dashboard). |
| Backend API | Live (Jobref router built, pending deploy) | `api.applaut.lvamo.com` (Oracle Cloud VM `lvamo-backend`, `130.61.106.172`, Ampere A1.Flex, 4 OCPU/24GB, Docker) — serves both verticals: Applaut under `/api/v1/applaut/*`, Jobref under `/api/v1/jobref/*`. See "Oracle Backend Migration" below for how this VM came to be; see "Multi-Vertical Architecture" below for how each vertical's backend attaches to it. |
| Database | Live (Jobref tables migrated locally, pending prod migration) | PostgreSQL 16 in Docker on `lvamo-backend` — Applaut's schema (see `PROGRESS_APPLAUT.md`) plus Jobref's `jobref_users`/`jobref_employee_profiles`/`jobref_seeker_profiles` (see `PROGRESS_JOBREF.md`). |
| Storage | Configured | Cloudflare R2 (resumes, documents) |

**VM access:** `ssh -i C:\Users\vvenk\Downloads\ssh-key-2026-07-10.key ubuntu@130.61.106.172`
**Old VM (`applaut-backend`, `130.61.65.131`):** deleted as part of the Aug 2026 migration — do not use.
**App dir on VM:** `/home/ubuntu/lvamo-applaut/`
**Deploy backend:** `sudo docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build backend`
**Or just run `bash deploy.sh`** on the VM — pulls, rebuilds, migrates, restarts, prunes.
**OCI API access is set up** (Python SDK + API key at `~/.oci/config` on the dev machine) — instance create/terminate/resize no longer needs manual Console clicks; see "Oracle Backend Migration" below for the one-time setup and gotchas.
**Cloudflare API access is set up** too (scoped token, `lvamo.com` zone, DNS edit only, saved at `~/.cloudflare/token` on the dev machine) — DNS record changes for this domain no longer need the dashboard either.
**⚠️ `nginx` gotcha**: if the VM is ever rebooted, `nginx`'s `restart: always` policy will bring it back even if it was manually `docker stop`ped before — a host reboot resets Docker's memory of that. Not a problem currently (cert exists, nginx starts fine), just worth knowing if this ever needs debugging again.
**⚠️ Unpushed local commits**: Jobref's login/registration feature (commit `3d5fd42`), plus this session's work gating registration through LinkedIn OAuth, are on local `main` but **not pushed to `origin`** and not deployed. The LinkedIn work is also blocked on the user creating a LinkedIn Developer App (not yet done) before it can be tested against real LinkedIn, let alone deployed. Don't push/deploy without checking first; see `PROGRESS_JOBREF.md`'s banner + "Next steps" for detail.

---

## Multi-Vertical Architecture

LVAMO is explicitly a multi-vertical platform now (Applaut live, Jobref
next). The pattern, established Aug 2026, for any vertical `<x>`:

- **Frontend routes** live under `/<x>/*` (e.g. `/applaut/login`,
  `/applaut/dashboard`). The LVAMO hub at `/` lists all verticals and links
  into each.
- **Backend API routes** live under `/api/v1/<x>/*` on the shared backend
  (e.g. `/api/v1/applaut/auth/login`). A vertical's whole FastAPI router
  tree mounts under this prefix — see `backend/app/main.py`.
- **Auth is isolated per vertical** — separate localStorage token key
  (`<x>_access_token`), separate JWT issuance, so one vertical's session
  can't collide with another's even though they currently share one backend
  process and one Postgres instance.
- Verticals currently **share** the backend VM and database server. Nothing
  about the URL namespacing requires this — a vertical can be split onto
  its own process, container, database, or VM later without touching the
  others, if/when it needs independent scaling or deploy cycles. Jobref's
  auth now lives on this shared backend/DB too (its own tables, own JWTs
  scoped with a `"vertical": "jobref"` claim so a token can't be replayed
  across verticals — see `PROGRESS_JOBREF.md`).

Applaut's namespacing work (the actual migration, file-by-file) is recorded
in `PROGRESS_APPLAUT.md`, not here — this section is the durable policy, not
a change-log entry.

### Codebase structure matches the URL structure (Aug 2026)

The URL namespacing above only covers *routes*. Until Aug 2026 the actual
**file layout** didn't know verticals existed — `backend/app/models/user.py`,
`frontend/src/pages/Login.tsx` etc. were Applaut-only code sitting in flat,
unmarked shared folders (a historical artifact: this codebase *was* Applaut
before Jobref existed as a concept). Restructured both sides so the folder
structure matches the URL structure, for every vertical going forward — this
is "package by feature" / a modular-monolith split, not something unusual:

**Backend** (`backend/app/`):
- `applaut/` — everything Applaut-specific: models (except `base.py`),
  schemas, services, `api/v1/` routers, `discovery/`, `generation/`,
  `scoring/`, plus the Applaut-only `core/ai.py` (resume-extraction AI),
  `core/extract_text.py`, `core/role_synonyms.py`.
- Shared top-level, **only** things with zero vertical-specific logic:
  `main.py` (mounts each vertical's router), `config.py` (Settings),
  `db/session.py` + `db/base.py` (engine, `get_db`, SQLAlchemy `Base`/
  `TimestampMixin`/`UUIDPrimaryKey`), `core/security.py` (password/JWT
  helpers), `core/storage.py` (R2 client).
- A future `jobref/` sibling to `applaut/` follows the identical shape.

**Frontend** (`frontend/src/`):
- `applaut/{api,components,context,pages}/` — everything Applaut-specific.
- `jobref/{api,components,context,pages}/` — Jobref's auth flow
  (login/register/dashboard); grows the same shape as more gets built.
- Shared top-level: `main.tsx`, `App.tsx`, `index.css`,
  `components/{Logo,BrandedPage}.tsx`, `hooks/useDocumentTitle.ts`,
  `pages/Hub.tsx`.

**The rule for what's shared vs. vertical-specific**: only promote something
to the shared layer once it's *proven* to have zero product-specific logic
(verified by reading it, not guessed) — sharing too eagerly creates hidden
coupling between verticals; not sharing genuinely-generic infra just
duplicates it. When in doubt, keep it in the vertical folder; promote later
if a second vertical actually needs it.

This was a pure reorganization (verified: byte-identical frontend bundle
hashes before/after, zero backend behavior change) — see `PROGRESS_APPLAUT.md`
for the file-by-file move log if ever needed for reference.

---

## Oracle Backend Migration (COMPLETE, Aug 2026)

**Why:** the old VM (OCI display name `applaut-backend`, `130.61.65.131`) was
a **fixed** `VM.Standard.E2.1.Micro` shape — 1 OCPU / 1GB RAM, not resizable,
already down to ~250MB free RAM with just Applaut running (no room for
Jobref later). Moved to Oracle's Ampere A1.Flex tier instead — started the
launch attempt at 2 OCPU/12GB (Oracle's free Ampere allotment had just been
reduced from the historical 4 OCPU/24GB — noted 2026-08 via an Oracle
console banner), ended up at the full **4 OCPU / 24GB** after the account
was upgraded to Pay-As-You-Go mid-migration (see step 7 — still $0, Always
Free entitlements stay free on PAYG). New instance name: `lvamo-backend`
(generic, not vertical-specific, per the Multi-Vertical Architecture above).
**Total elapsed time: ~24 hours, almost all of it waiting on Oracle capacity,
not active work.**

**Sequencing note:** the user explicitly chose to delete the old instance
*before* creating the new one (not a side-by-side blue-green migration) —
so there was no rollback safety net, only the backup below. This was a
known, accepted trade-off, not an accident.

### What was done
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
   what's in git) so the new one could be a faithful rebuild:
   - Docker installed via **`apt install docker.io docker-compose-plugin
     docker-buildx-plugin`** (Ubuntu's own repo, NOT Docker's official CE
     repo/get.docker.com script).
   - `certbot` + `python3-certbot` via apt (classic, not snap) — ships its
     own `certbot.timer` systemd unit for auto-renewal, enabled by default
     on install, no manual setup needed.
   - Cert: standalone HTTP-01 authenticator, standard Let's Encrypt prod
     server, for `api.applaut.lvamo.com` only.
   - Host firewall: Oracle's Ubuntu cloud image ships iptables with a
     default-REJECT policy after allowing established/related/ICMP/SSH —
     ports 80 and 443 were opened via `iptables -I INPUT <pos> -m state
     --state NEW -p tcp --dport {80,443} -j ACCEPT`, then persisted via
     `apt install -y iptables-persistent && netfilter-persistent save`.
   - No swap configured. No custom `/etc/docker/daemon.json`. No crontab
     entries. Nothing manually added to the repo dir outside git except
     `.env.production` (confirmed via `git status --ignored`).
3. ✅ **OCI API access set up** (durable, reusable going forward — not just
   for this migration):
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
     requests` and was replaced with this slower pacing).
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
     durable across session boundaries than a plain background process.
6. ✅ **Provisioned** — replicated the audited old-VM config on the new box:
   - Docker packages differ by Ubuntu version: old box (20.04) used
     `docker.io docker-compose-plugin docker-buildx-plugin`; new box (24.04)
     needed **`docker.io docker-compose-v2 docker-buildx`** instead — apt
     aborts the whole install line if any package name is wrong.
   - iptables: fresh Ubuntu 24.04 image has the identical default-REJECT
     baseline as the old 20.04 one — opened 80/443 the same way, persisted
     with `netfilter-persistent save`.
   - certbot via apt as before — `certbot.timer` auto-enabled.
   - Repo cloned, `.env.production` + DB dump `scp`'d up from the local
     backup, `postgres` brought up first and the dump restored via
     `pg_restore` inside the container before starting anything else —
     verified row counts matched the backup.
   - `backend` built and started cleanly on ARM64 — all Python dependencies
     in `requirements.txt` had prebuilt `aarch64` wheels, no compile-from-
     source issues.
   - Alembic migrations ran clean (no-op, DB was already at head from the
     restored dump).
   - Validated the backend directly, bypassing `nginx` (chicken-and-egg:
     `nginx`'s config requires a TLS cert that can't be issued until DNS
     points here) — the `python:3.12-slim` image has no `curl`, so used
     `python3 -c "import urllib.request..."` inside the container instead.
7. ✅ **Account upgraded to Pay-As-You-Go mid-migration** — almost certainly
   *why* the ~22.5h capacity wait finally succeeded (PAYG gets priority
   capacity access even for Always-Free-eligible shapes). User then resized
   the instance up to the *full* Always-Free Ampere allotment (4 OCPU/24GB,
   still $0) and rebooted. Verified clean afterward: same public IP, shape
   confirmed 4 OCPU/24GB at both the OCI API and OS level (`nproc`=4,
   `free -h`=23Gi), Docker daemon active, `backend`+`postgres` survived
   the reboot and stayed healthy, iptables rules persisted. Only `nginx`
   needed re-stopping (a full host reboot resets Docker's memory of a
   manual `docker stop`, unlike a daemon-only restart).
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

## Tech Stack Quick Reference

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Backend | Python 3.12, FastAPI |
| Database | PostgreSQL 16 |
| Storage | Cloudflare R2 |
| Automation | Playwright (used for verification; not yet wired into the product for auto-apply) |
| Hosting | Oracle Cloud VM (backend), Cloudflare Pages (frontend) |

Vertical-specific stack choices (e.g. Applaut's OpenAI usage) are documented
in that vertical's progress file, not here.

---

## Ground Rules (Non-Negotiable)

1. **Industry standards by default** — mobile-first, accessibility, security, REST conventions. Claude calls out deviations before implementing.
2. **No Co-Authored-By in git commits.**
3. **Never commit `.env` or `.env.production`.**
4. **Human approval first** — no auto-apply without explicit user opt-in.
5. **Never invent profile data** in document generation — only reorder/rephrase.
