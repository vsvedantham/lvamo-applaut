from dataclasses import dataclass, field

from app.models.opportunity import Opportunity
from app.models.profile import Profile
from app.models.resume import Resume
from app.scoring.keywords import (
    assess_keyword_suitability,
    detect_seniority,
    extract_tech_keywords_from_jd,
)

GOOD_THRESHOLD = 85
NEAR_MISS_THRESHOLD = 70


@dataclass
class DimensionResult:
    score: int
    max_score: int
    explanation: str


@dataclass
class ScoreResult:
    total: int
    dimensions: dict[str, DimensionResult]
    near_miss_keywords: list[dict] = field(default_factory=list)

    @property
    def is_good_match(self) -> bool:
        return self.total >= GOOD_THRESHOLD

    @property
    def is_near_miss(self) -> bool:
        return NEAR_MISS_THRESHOLD <= self.total < GOOD_THRESHOLD

    def to_explanation_dict(self) -> dict:
        return {
            k: {"score": v.score, "max": v.max_score, "explanation": v.explanation}
            for k, v in self.dimensions.items()
        }


def _score_role(title: str, target_roles: list[str]) -> DimensionResult:
    title_lower = title.lower()
    matches = [r for r in target_roles if r.lower() in title_lower]
    if matches:
        return DimensionResult(35, 35, f"Title matches target role(s): {', '.join(matches)}")
    partial = [r for r in target_roles if any(w in title_lower for w in r.lower().split())]
    if partial:
        return DimensionResult(18, 35, f"Partial title match: {', '.join(partial)}")
    return DimensionResult(0, 35, "No role keyword match in title")


def _score_skills(
    user_skills: list[str],
    resume_skills: list[str],
    jd_text: str,
) -> DimensionResult:
    combined = list({s.lower() for s in user_skills + resume_skills})
    if not combined or not jd_text:
        return DimensionResult(0, 25, "No skills data available")
    jd_lower = jd_text.lower()
    matched = [s for s in combined if s in jd_lower]
    ratio = len(matched) / max(len(combined), 1)
    score = round(ratio * 25)
    if matched:
        explanation = f"{len(matched)}/{len(combined)} skills found in JD: {', '.join(matched[:5])}"
    else:
        explanation = "None of your skills found in job description"
    return DimensionResult(score, 25, explanation)


def _score_location(
    country_code: str | None,
    remote_option: str | None,
    target_countries: list[str],
    remote_preference: str,
) -> DimensionResult:
    if country_code in target_countries:
        loc_score = 15
        loc_exp = f"Country {country_code} matches your targets"
    elif remote_option == "remote":
        loc_score = 10
        loc_exp = "Remote position — available globally"
    else:
        loc_score = 0
        loc_exp = "Location does not match your target countries"

    pref_map = {
        ("remote", "remote"): (5, "Remote preference matches"),
        ("hybrid", "hybrid"): (5, "Hybrid preference matches"),
        ("onsite", "onsite"): (5, "On-site preference matches"),
        ("any", "remote"): (4, "Remote (your preference: any)"),
        ("any", "hybrid"): (4, "Hybrid (your preference: any)"),
        ("any", "onsite"): (4, "On-site (your preference: any)"),
    }
    pref_score, pref_exp = pref_map.get(
        (remote_preference, remote_option or ""),
        (2, f"Partial remote match ({remote_option} vs your preference: {remote_preference})")
    )
    return DimensionResult(loc_score + pref_score, 20, f"{loc_exp}; {pref_exp}")


def _score_employment_type(
    job_type: str | None,
    user_types: list[str],
) -> DimensionResult:
    if not job_type:
        return DimensionResult(5, 10, "Employment type not specified in listing")
    if job_type in user_types:
        return DimensionResult(10, 10, f"Employment type {job_type} matches your preferences")
    return DimensionResult(0, 10, f"Employment type {job_type} not in your preferences: {', '.join(user_types)}")


def _score_experience(
    title: str,
    experience_years: int | None,
) -> DimensionResult:
    seniority = detect_seniority(title)
    if experience_years is None:
        return DimensionResult(5, 10, "Experience years not set in profile")

    if seniority == "senior" and experience_years >= 5:
        return DimensionResult(10, 10, f"Senior role matches your {experience_years}y experience")
    if seniority == "senior" and experience_years >= 3:
        return DimensionResult(7, 10, f"Senior role, you have {experience_years}y (ideally 5+)")
    if seniority == "mid" and 2 <= experience_years <= 8:
        return DimensionResult(10, 10, f"Mid-level role fits your {experience_years}y experience")
    if seniority == "junior" and experience_years <= 3:
        return DimensionResult(10, 10, f"Junior role matches your {experience_years}y experience")
    if seniority == "junior" and experience_years > 3:
        return DimensionResult(5, 10, f"Junior role but you have {experience_years}y — overqualified?")
    return DimensionResult(6, 10, f"Experience level: {seniority}, you have {experience_years}y")


def score_opportunity(
    opportunity: Opportunity,
    profile: Profile,
    resume: Resume | None,
) -> ScoreResult:
    resume_skills: list[str] = []
    if resume and resume.content_extracted:
        resume_skills = resume.content_extracted.get("skills", [])

    jd_text = (opportunity.description or "") + " " + (opportunity.requirements or "")

    role_dim = _score_role(opportunity.title, profile.target_roles or [])
    skills_dim = _score_skills(profile.skills or [], resume_skills, jd_text)
    location_dim = _score_location(
        opportunity.country_code,
        opportunity.remote_option,
        profile.target_countries or [],
        profile.remote_preference or "any",
    )
    emp_dim = _score_employment_type(opportunity.employment_type, profile.employment_types or [])
    exp_dim = _score_experience(opportunity.title, profile.total_experience_years)

    total = role_dim.score + skills_dim.score + location_dim.score + emp_dim.score + exp_dim.score

    result = ScoreResult(
        total=total,
        dimensions={
            "role": role_dim,
            "skills": skills_dim,
            "location": location_dim,
            "employment_type": emp_dim,
            "experience": exp_dim,
        },
    )

    # Near-miss gap analysis
    if result.is_near_miss:
        user_skills = list({s.lower() for s in (profile.skills or []) + resume_skills})
        jd_keywords = extract_tech_keywords_from_jd(jd_text)
        gap_keywords = [kw for kw in jd_keywords if kw not in user_skills]
        result.near_miss_keywords = [
            assess_keyword_suitability(kw, user_skills, profile.total_experience_years)
            for kw in gap_keywords[:10]
        ]

    return result
