import json

from openai import AsyncOpenAI

from app.config import settings
from app.applaut.models.opportunity import Opportunity
from app.applaut.models.profile import Profile
from app.applaut.models.resume import Resume
from app.applaut.scoring.rule_based import DimensionResult, ScoreResult

AI_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT_TEMPLATE = """
You are a career matching engine. Given a candidate profile and a job description,
score the match on a 0–100 scale across five dimensions and explain every decision.

Scoring dimensions and their max points:
- role:            max 35  (how well the job title matches the candidate's target roles)
- skills:          max 25  (how many of the JD's required skills the candidate has)
- location:        max 20  (country match + remote preference alignment)
- employment_type: max 10  (full-time / contract / etc.)
- experience:      max 10  (seniority level vs candidate's years of experience)

Respond ONLY with valid JSON in this exact structure:
{{
  "total": <int 0-100>,
  "dimensions": {{
    "role":            {{"score": <int 0-35>, "max": 35, "explanation": "<str>"}},
    "skills":          {{"score": <int 0-25>, "max": 25, "explanation": "<str>"}},
    "location":        {{"score": <int 0-20>, "max": 20, "explanation": "<str>"}},
    "employment_type": {{"score": <int 0-10>, "max": 10, "explanation": "<str>"}},
    "experience":      {{"score": <int 0-10>, "max": 10, "explanation": "<str>"}}
  }},
  "near_miss_keywords": [
    {{"keyword": "<str>", "suitable": <true|false|null>, "reason": "<str>"}}
  ]
}}

near_miss_keywords: include ONLY when total is between {near_miss} and {good_minus_1}.
List skills from the JD the candidate lacks. suitable=true means clearly in their domain,
false means outside it, null means uncertain.
""".strip()


def _get_async_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.openai_api_key)


def _build_user_message(profile: Profile, resume: Resume | None, opportunity: Opportunity) -> str:
    resume_skills: list[str] = []
    resume_exp: list[dict] = []
    if resume and resume.content_extracted:
        resume_skills = resume.content_extracted.get("skills", [])
        resume_exp = resume.content_extracted.get("experience", [])

    all_skills = list({s for s in (profile.skills or []) + resume_skills})

    profile_block = f"""CANDIDATE PROFILE
=================
Target roles: {', '.join(profile.target_roles or [])}
Target countries: {', '.join(profile.target_countries or [])}
Experience years: {profile.total_experience_years or 'not specified'}
Remote preference: {profile.remote_preference}
Employment types: {', '.join(profile.employment_types or [])}
Skills: {', '.join(all_skills)}"""

    if resume_exp:
        entries = [
            f"- {e.get('title')} at {e.get('company')} "
            f"({e.get('start_date', '')}–{e.get('end_date', 'present')})"
            for e in resume_exp[:5]
        ]
        profile_block += "\nExperience:\n" + "\n".join(entries)

    jd_block = f"""JOB LISTING
===========
Title: {opportunity.title}
Company: {opportunity.company_name}
Location: {opportunity.location_raw or 'not specified'} ({opportunity.country_code or '?'})
Remote: {opportunity.remote_option or 'not specified'}
Employment type: {opportunity.employment_type or 'not specified'}

Description:
{(opportunity.description or '')[:3000]}"""

    return profile_block + "\n\n" + jd_block


async def score_opportunity_ai(
    opportunity: Opportunity,
    profile: Profile,
    resume: Resume | None,
) -> ScoreResult:
    client = _get_async_client()
    near_miss_threshold = profile.good_threshold - 15
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        near_miss=near_miss_threshold,
        good_minus_1=profile.good_threshold - 1,
    )
    message = _build_user_message(profile, resume, opportunity)

    response = await client.chat.completions.create(
        model=AI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)

    dims: dict[str, DimensionResult] = {}
    for key, max_val in (("role", 35), ("skills", 25), ("location", 20), ("employment_type", 10), ("experience", 10)):
        d = data.get("dimensions", {}).get(key, {})
        dims[key] = DimensionResult(
            score=int(d.get("score", 0)),
            max_score=int(d.get("max", max_val)),
            explanation=str(d.get("explanation", "")),
        )

    total = int(data.get("total", sum(d.score for d in dims.values())))
    near_miss_kw = (
        data.get("near_miss_keywords", [])
        if near_miss_threshold <= total < profile.good_threshold
        else []
    )

    return ScoreResult(total=total, dimensions=dims, near_miss_keywords=near_miss_kw)
