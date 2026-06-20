import json

from app.core.ai import get_openai_client
from app.models.opportunity import Opportunity
from app.models.profile import Profile
from app.models.resume import Resume
from app.scoring.rule_based import GOOD_THRESHOLD, NEAR_MISS_THRESHOLD, ScoreResult, DimensionResult

AI_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = """
You are a career matching engine. Given a candidate profile and a job description,
score the match on a 0-100 scale and explain every decision.

Respond ONLY with valid JSON in this exact structure:
{
  "total": <int 0-100>,
  "dimensions": {
    "role": {"score": <int>, "max": 35, "explanation": "<str>"},
    "skills": {"score": <int>, "max": 25, "explanation": "<str>"},
    "location": {"score": <int>, "max": 20, "explanation": "<str>"},
    "employment_type": {"score": <int>, "max": 10, "explanation": "<str>"},
    "experience": {"score": <int>, "max": 10, "explanation": "<str>"}
  },
  "near_miss_keywords": [
    {"keyword": "<str>", "suitable": <true|false|null>, "reason": "<str>"}
  ]
}

near_miss_keywords: only include if total is between 70 and 84. List skills from the JD
the candidate lacks, with your assessment of whether they could reasonably acquire them
given their background. suitable=true means clearly learnable, false means outside their domain, null means uncertain.
"""


def _build_user_message(profile: Profile, resume: Resume | None, opportunity: Opportunity) -> str:
    resume_skills: list[str] = []
    resume_exp = []
    if resume and resume.content_extracted:
        resume_skills = resume.content_extracted.get("skills", [])
        resume_exp = resume.content_extracted.get("experience", [])

    profile_block = f"""
CANDIDATE PROFILE
=================
Target roles: {', '.join(profile.target_roles or [])}
Target countries: {', '.join(profile.target_countries or [])}
Experience years: {profile.total_experience_years or 'not specified'}
Remote preference: {profile.remote_preference}
Employment types: {', '.join(profile.employment_types or [])}
Skills: {', '.join((profile.skills or []) + resume_skills)}
""".strip()

    exp_block = ""
    if resume_exp:
        entries = [f"- {e.get('title')} at {e.get('company')} ({e.get('start_date', '')}–{e.get('end_date', 'present')})" for e in resume_exp[:5]]
        exp_block = "\nExperience:\n" + "\n".join(entries)

    jd_block = f"""
JOB LISTING
===========
Title: {opportunity.title}
Company: {opportunity.company_name}
Location: {opportunity.location_raw or 'not specified'} ({opportunity.country_code or '?'})
Remote: {opportunity.remote_option or 'not specified'}
Employment type: {opportunity.employment_type or 'not specified'}

Description:
{(opportunity.description or '')[:3000]}
""".strip()

    return profile_block + exp_block + "\n\n" + jd_block


async def score_opportunity_ai(
    opportunity: Opportunity,
    profile: Profile,
    resume: Resume | None,
) -> ScoreResult:
    client = get_openai_client()
    message = _build_user_message(profile, resume, opportunity)

    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)

    dims = {}
    for key in ("role", "skills", "location", "employment_type", "experience"):
        d = data.get("dimensions", {}).get(key, {})
        dims[key] = DimensionResult(
            score=d.get("score", 0),
            max_score=d.get("max", 0),
            explanation=d.get("explanation", ""),
        )

    total = data.get("total", sum(d.score for d in dims.values()))
    near_miss = data.get("near_miss_keywords", []) if NEAR_MISS_THRESHOLD <= total < GOOD_THRESHOLD else []

    return ScoreResult(total=total, dimensions=dims, near_miss_keywords=near_miss)
