import httpx

from app.discovery.base import JobListing, JobSourceAdapter
from app.discovery.location import matches_countries, matches_roles, resolve_country, resolve_remote_option

BASE_URL = "https://api.personio.de/v1/recruiting/positions"


class PersonioAdapter(JobSourceAdapter):
    source_name = "personio"

    async def fetch_jobs(
        self,
        company_slug: str,
        target_countries: list[str],
        target_roles: list[str],
    ) -> list[JobListing]:
        # Personio public job widget API uses company subdomain
        url = f"https://{company_slug}.jobs.personio.de/api/v1/jobs"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, headers={"Accept": "application/json"})
                if resp.status_code != 200:
                    return []
                jobs = resp.json()
        except Exception:
            return []

        if isinstance(jobs, dict):
            jobs = jobs.get("data", jobs.get("jobs", []))

        results = []
        for job in jobs:
            title = job.get("name", "") or job.get("title", "")
            if not matches_roles(title, target_roles):
                continue

            location_raw = (
                job.get("office")
                or job.get("location")
                or job.get("department")
            )
            if isinstance(location_raw, dict):
                location_raw = location_raw.get("name") or location_raw.get("office")

            country_code = resolve_country(str(location_raw) if location_raw else None)
            if not matches_countries(country_code, target_countries):
                continue

            job_id = str(job.get("id", ""))
            results.append(
                JobListing(
                    source=self.source_name,
                    external_id=job_id,
                    title=title,
                    company_name=company_slug,
                    application_url=f"https://{company_slug}.jobs.personio.de/job/{job_id}",
                    location_raw=str(location_raw) if location_raw else None,
                    country_code=country_code,
                    description=job.get("description"),
                    remote_option=resolve_remote_option(str(location_raw) if location_raw else None),
                    raw_data=job,
                )
            )
        return results
