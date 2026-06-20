import httpx

from app.discovery.base import JobListing, JobSourceAdapter
from app.discovery.location import matches_countries, matches_roles, resolve_country, resolve_remote_option

GRAPHQL_URL = "https://jobs.ashbyhq.com/api/non-authenticated-graphql"

QUERY = """
query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
  jobBoard: jobBoardWithTeams(
    organizationHostedJobsPageName: $organizationHostedJobsPageName
  ) {
    jobPostings {
      id
      title
      locationName
      employmentType
      isRemote
      externalLink
      descriptionPlain
    }
  }
}
"""


class AshbyAdapter(JobSourceAdapter):
    source_name = "ashby"

    async def fetch_jobs(
        self,
        company_slug: str,
        target_countries: list[str],
        target_roles: list[str],
    ) -> list[JobListing]:
        payload = {"operationName": "ApiJobBoardWithTeams", "query": QUERY, "variables": {"organizationHostedJobsPageName": company_slug}}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(GRAPHQL_URL, json=payload)
                if resp.status_code != 200:
                    return []
                data = resp.json()
        except Exception:
            return []

        postings = (
            data.get("data", {})
            .get("jobBoard", {})
            .get("jobPostings", [])
        ) or []

        results = []
        for job in postings:
            title = job.get("title", "")
            if not matches_roles(title, target_roles):
                continue

            location_raw = job.get("locationName")
            is_remote = job.get("isRemote", False)
            country_code = resolve_country(location_raw) if not is_remote else None

            if is_remote:
                remote_option = "remote"
                # Remote jobs are valid for all target countries
            else:
                remote_option = resolve_remote_option(location_raw)
                if not matches_countries(country_code, target_countries):
                    continue

            results.append(
                JobListing(
                    source=self.source_name,
                    external_id=job["id"],
                    title=title,
                    company_name=company_slug,
                    application_url=job.get("externalLink") or f"https://jobs.ashbyhq.com/{company_slug}/{job['id']}",
                    location_raw=location_raw,
                    country_code=country_code,
                    description=job.get("descriptionPlain"),
                    remote_option=remote_option,
                    raw_data=job,
                )
            )
        return results
