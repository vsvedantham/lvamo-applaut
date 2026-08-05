"""
Offline company-slug discovery for the job-discovery engine.

Takes a seed list of company display names (one per line) and probes each
against every supported ATS's public endpoint under a handful of slug-naming
conventions, keeping only slugs that resolve to a real, non-empty job board.
Output feeds app/discovery/companies.py via app/discovery/data/company_boards.json
— it does not touch companies.py's hand-curated entries.

This is a standalone offline batch job, not part of the request path. Run by
hand, not on a schedule.

Usage (paths default to seed_companies.txt / ../app/discovery/data/company_boards.json
relative to this script, so it works from any cwd — repo root or inside the
backend container):
    python backend/scripts/discover_company_slugs.py --mode append

    # Quick smoke test against the first 10 seed names:
    python backend/scripts/discover_company_slugs.py --limit 10
"""

import argparse
import asyncio
import json
import random
import re
from pathlib import Path

import httpx

USER_AGENT = "Applaut-CompanyDiscovery/1.0 (+https://lvamo.com)"
REQUEST_TIMEOUT = 10
JITTER_RANGE = (0.05, 0.25)

# Per-host concurrency caps — each ATS platform is a distinct rate-limit
# domain, so these are independent, not summed.
DEFAULT_CONCURRENCY = 6

LEGAL_SUFFIXES = [
    "gmbh & co. kg", "gmbh and co kg", "gmbh", "ag", "se", "kgaa", "ug",
    "inc.", "inc", "llc", "ltd.", "ltd", "limited", "plc", "corp.", "corp",
    "corporation", "co.", "sa", "s.a.", "nv", "n.v.", "bv", "b.v.", "sas",
    "s.a.s.", "oy", "ab", "as", "a/s", "spa", "s.p.a.",
]


def _strip_legal_suffix(name: str) -> str:
    lowered = name.strip().lower()
    for suffix in sorted(LEGAL_SUFFIXES, key=len, reverse=True):
        pattern = r"[\s,]+" + re.escape(suffix) + r"$"
        stripped = re.sub(pattern, "", lowered)
        if stripped != lowered:
            return stripped.strip()
    return lowered


def slug_variants(company_name: str) -> list[str]:
    """lowercase-hyphen / nospace / underscore variants for most ATS platforms."""
    base = _strip_legal_suffix(company_name)
    base = re.sub(r"[^a-z0-9\s-]", "", base)
    words = base.split()
    if not words:
        return []
    return list(dict.fromkeys([
        "-".join(words),
        "".join(words),
        "_".join(words),
    ]))


def pascal_case_variants(company_name: str) -> list[str]:
    """PascalCase-concatenated variants — SmartRecruiters' convention."""
    base = _strip_legal_suffix(company_name)
    base = re.sub(r"[^a-zA-Z0-9\s]", "", base)
    words = base.split()
    if not words:
        return []
    pascal = "".join(w.capitalize() for w in words)
    return list(dict.fromkeys([pascal, pascal + "Group"]))


async def _sleep_jitter():
    await asyncio.sleep(random.uniform(*JITTER_RANGE))


async def probe_greenhouse(client: httpx.AsyncClient, slug: str) -> bool:
    try:
        resp = await client.get(f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs")
        if resp.status_code != 200:
            return False
        return bool(resp.json().get("jobs"))
    except Exception:
        return False


async def probe_lever(client: httpx.AsyncClient, slug: str) -> bool:
    try:
        resp = await client.get(f"https://api.lever.co/v0/postings/{slug}?mode=json&limit=1")
        if resp.status_code != 200:
            return False
        return bool(resp.json())
    except Exception:
        return False


ASHBY_QUERY = """
query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
  jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
    jobPostings { id }
  }
}
"""


async def probe_ashby(client: httpx.AsyncClient, slug: str) -> bool:
    try:
        payload = {
            "operationName": "ApiJobBoardWithTeams",
            "query": ASHBY_QUERY,
            "variables": {"organizationHostedJobsPageName": slug},
        }
        resp = await client.post("https://jobs.ashbyhq.com/api/non-authenticated-graphql", json=payload)
        if resp.status_code != 200:
            return False
        postings = (resp.json().get("data") or {}).get("jobBoard", {}).get("jobPostings")
        return bool(postings)
    except Exception:
        return False


async def probe_personio(client: httpx.AsyncClient, slug: str) -> bool:
    # Personio retired its /api/v1/jobs JSON endpoint (now 404s, replaced by a
    # client-rendered SPA); the legacy /xml feed (their "workzag-jobs" format,
    # from the Workzag product Personio's recruiting board was built on) is
    # still live and is the only public no-auth job-listing source left.
    try:
        resp = await client.get(f"https://{slug}.jobs.personio.de/xml")
        if resp.status_code != 200:
            return False
        return "<position>" in resp.text
    except Exception:
        return False


async def probe_workable(client: httpx.AsyncClient, slug: str) -> bool:
    try:
        resp = await client.post(f"https://apply.workable.com/api/v3/accounts/{slug}/jobs", json={})
        if resp.status_code != 200:
            return False
        return bool(resp.json().get("results"))
    except Exception:
        return False


async def probe_smartrecruiters(client: httpx.AsyncClient, slug: str) -> bool:
    try:
        resp = await client.get(
            f"https://api.smartrecruiters.com/v1/companies/{slug}/postings",
            params={"limit": 1},
        )
        if resp.status_code != 200:
            return False
        return bool(resp.json().get("content"))
    except Exception:
        return False


async def probe_recruitee(client: httpx.AsyncClient, slug: str) -> bool:
    try:
        resp = await client.get(
            f"https://{slug}.recruitee.com/api/offers/",
            headers={"Accept": "application/json"},
        )
        if resp.status_code != 200:
            return False
        return bool(resp.json().get("offers"))
    except Exception:
        return False


# (adapter key, probe fn, slug-variant generator)
ADAPTERS = [
    ("greenhouse", probe_greenhouse, slug_variants),
    ("lever", probe_lever, slug_variants),
    ("ashby", probe_ashby, slug_variants),
    ("personio", probe_personio, slug_variants),
    ("workable", probe_workable, slug_variants),
    ("smartrecruiters", probe_smartrecruiters, pascal_case_variants),
    ("recruitee", probe_recruitee, slug_variants),
]


async def probe_company(
    semaphores: dict[str, asyncio.Semaphore],
    client: httpx.AsyncClient,
    company_name: str,
    adapters: list[tuple],
) -> list[dict]:
    hits = []
    for adapter_key, probe_fn, variant_fn in adapters:
        for slug in variant_fn(company_name):
            async with semaphores[adapter_key]:
                await _sleep_jitter()
                found = await probe_fn(client, slug)
            if found:
                hits.append({"adapter": adapter_key, "slug": slug, "name": company_name})
                break  # first working variant per adapter is enough
    return hits


async def run(seed_names: list[str], concurrency: int, adapters: list[tuple]) -> list[dict]:
    semaphores = {key: asyncio.Semaphore(concurrency) for key, _, _ in adapters}
    headers = {"User-Agent": USER_AGENT}
    all_hits: list[dict] = []

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers=headers) as client:
        tasks = [probe_company(semaphores, client, name, adapters) for name in seed_names]
        for i, task in enumerate(asyncio.as_completed(tasks), 1):
            hits = await task
            all_hits.extend(hits)
            print(f"[{i}/{len(tasks)}] probed — {len(hits)} hit(s) so far this company", flush=True)

    return all_hits


SCRIPT_DIR = Path(__file__).parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", default=str(SCRIPT_DIR / "seed_companies.txt"))
    parser.add_argument("--output", default=str(SCRIPT_DIR.parent / "app" / "discovery" / "data" / "company_boards.json"))
    parser.add_argument("--mode", choices=["append", "regenerate"], default="append")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument("--limit", type=int, default=None, help="only probe the first N seed names")
    parser.add_argument(
        "--adapters",
        default=None,
        help="comma-separated subset of adapter keys to probe (default: all). "
        f"Choices: {', '.join(key for key, _, _ in ADAPTERS)}",
    )
    args = parser.parse_args()

    adapters = ADAPTERS
    if args.adapters:
        wanted = {a.strip() for a in args.adapters.split(",")}
        adapters = [a for a in ADAPTERS if a[0] in wanted]

    seed_path = Path(args.seed)
    names = [line.strip() for line in seed_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if args.limit:
        names = names[: args.limit]

    print(f"Probing {len(names)} seed companies across {len(adapters)} adapter(s): {', '.join(a[0] for a in adapters)}")
    hits = asyncio.run(run(names, args.concurrency, adapters))

    output_path = Path(args.output)
    existing: list[dict] = []
    if args.mode == "append" and output_path.exists():
        existing = json.loads(output_path.read_text(encoding="utf-8"))

    seen = {(e["adapter"], e["slug"]) for e in existing}
    merged = list(existing)
    for hit in hits:
        key = (hit["adapter"], hit["slug"])
        if key not in seen:
            merged.append(hit)
            seen.add(key)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"\nFound {len(hits)} new hit(s) this run. Total in {output_path}: {len(merged)}")


if __name__ == "__main__":
    main()
