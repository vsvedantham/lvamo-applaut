from app.discovery.adapters.greenhouse import GreenhouseAdapter
from app.discovery.adapters.lever import LeverAdapter
from app.discovery.adapters.personio import PersonioAdapter
from app.discovery.base import JobSourceAdapter

# (adapter_instance, company_slug)
# Remote jobs are included when no explicit non-target country is in the location.
COMPANY_BOARDS: list[tuple[JobSourceAdapter, str]] = [
    # --- Greenhouse: EU-headquartered or EU-office companies ---
    (GreenhouseAdapter(), "celonis"),        # Munich, Germany — process mining
    (GreenhouseAdapter(), "sumup"),          # Berlin, Germany — fintech
    (GreenhouseAdapter(), "getyourguide"),   # Berlin, Germany — travel tech
    (GreenhouseAdapter(), "hellofresh"),     # Berlin, Germany — food tech
    (GreenhouseAdapter(), "adyen"),          # Amsterdam, NL — payments
    (GreenhouseAdapter(), "intercom"),       # Dublin, IE — customer comms
    (GreenhouseAdapter(), "elastic"),        # distributed / EU-remote
    (GreenhouseAdapter(), "contentful"),     # Berlin, Germany — CMS
    (GreenhouseAdapter(), "datadog"),        # EU-remote roles
    (GreenhouseAdapter(), "mongodb"),        # EU-remote roles
    (GreenhouseAdapter(), "twilio"),         # EU-remote roles
    (GreenhouseAdapter(), "cloudflare"),     # EU-remote roles
    (GreenhouseAdapter(), "okta"),           # EU offices
    (GreenhouseAdapter(), "figma"),          # EU-remote roles
    (GreenhouseAdapter(), "stripe"),         # Dublin, IE office
    (GreenhouseAdapter(), "asana"),          # EU-remote roles
    # --- Lever ---
    (LeverAdapter(), "spotify"),             # Stockholm, Sweden
    # --- Personio: DACH companies ---
    (PersonioAdapter(), "flixbus"),
    (PersonioAdapter(), "westwing"),
]
