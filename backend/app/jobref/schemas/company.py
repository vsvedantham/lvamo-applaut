from __future__ import annotations

from pydantic import BaseModel


class CompanyListItem(BaseModel):
    name: str
    careers_url: str
    # jobref.companies has one row per employee registration (no dedup at
    # write time — see models/jobref_company.py). This endpoint groups by
    # (name, careers_url) so a job seeker sees each company once, with this
    # count standing in for "how many employees there registered" rather
    # than hiding it.
    referrer_count: int
