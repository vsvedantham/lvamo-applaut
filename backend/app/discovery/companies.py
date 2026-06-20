from app.discovery.adapters.ashby import AshbyAdapter
from app.discovery.adapters.greenhouse import GreenhouseAdapter
from app.discovery.adapters.lever import LeverAdapter
from app.discovery.adapters.personio import PersonioAdapter
from app.discovery.base import JobSourceAdapter

# (adapter_instance, company_slug)
COMPANY_BOARDS: list[tuple[JobSourceAdapter, str]] = [
    # --- Greenhouse (verified EU-present companies) ---
    (GreenhouseAdapter(), "elastic"),
    (GreenhouseAdapter(), "contentful"),
    (GreenhouseAdapter(), "celonis"),
    (GreenhouseAdapter(), "sumup"),
    (GreenhouseAdapter(), "personio"),
    (GreenhouseAdapter(), "stripe"),
    (GreenhouseAdapter(), "databricks"),
    (GreenhouseAdapter(), "squarespace"),
    (GreenhouseAdapter(), "zendesk"),
    (GreenhouseAdapter(), "intercom"),
    (GreenhouseAdapter(), "asana"),
    (GreenhouseAdapter(), "figma"),
    (GreenhouseAdapter(), "notion"),
    (GreenhouseAdapter(), "hashicorp"),
    (GreenhouseAdapter(), "mongodb"),
    (GreenhouseAdapter(), "datadog"),
    (GreenhouseAdapter(), "twilio"),
    (GreenhouseAdapter(), "okta"),
    (GreenhouseAdapter(), "cloudflare"),
    (GreenhouseAdapter(), "brex"),
    # --- Lever (verified slugs) ---
    (LeverAdapter(), "spotify"),
    (LeverAdapter(), "booking"),
    # --- Ashby (remote-friendly, EU offices) ---
    (AshbyAdapter(), "openai"),
    (AshbyAdapter(), "anthropic"),
    (AshbyAdapter(), "retool"),
    (AshbyAdapter(), "linear"),
    (AshbyAdapter(), "vercel"),
    (AshbyAdapter(), "supabase"),
    (AshbyAdapter(), "dbt-labs"),
    (AshbyAdapter(), "airbyte"),
    (AshbyAdapter(), "dagster"),
    (AshbyAdapter(), "prefect"),
    # --- Personio (DACH companies) ---
    (PersonioAdapter(), "flixbus"),
    (PersonioAdapter(), "westwing"),
]
