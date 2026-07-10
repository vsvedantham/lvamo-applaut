from dataclasses import dataclass, field

from app.models.opportunity import Opportunity
from app.models.profile import Profile
from app.models.resume import Resume
from app.scoring.keywords import (
    assess_keyword_suitability,
    detect_seniority,
    extract_tech_keywords_from_jd,
)

# Role synonyms — expand target role matching beyond exact title
ROLE_SYNONYMS: dict[str, list[str]] = {
    "data engineer": ["data engineer", "analytics engineer", "etl developer", "pipeline engineer",
                      "big data engineer", "data platform engineer", "data infrastructure"],
    "data scientist": ["data scientist", "ml engineer", "machine learning engineer",
                       "ai engineer", "research scientist", "applied scientist"],
    "data analyst": ["data analyst", "business analyst", "analytics analyst",
                     "reporting analyst", "bi analyst", "business intelligence analyst"],
    "software engineer": ["software engineer", "software developer", "backend engineer",
                          "backend developer", "full stack", "fullstack", "application developer"],
    "frontend engineer": ["frontend engineer", "frontend developer", "ui engineer",
                          "web developer", "react developer", "javascript developer"],
    "devops engineer": ["devops engineer", "site reliability", "sre", "platform engineer",
                        "infrastructure engineer", "cloud engineer", "devsecops"],
    "product manager": ["product manager", "product owner", "program manager", "technical pm"],
    "data architect": ["data architect", "solution architect", "enterprise architect",
                       "cloud architect", "database architect"],
}


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

    def to_explanation_dict(self) -> dict:
        return {
            k: {"score": v.score, "max": v.max_score, "explanation": v.explanation}
            for k, v in self.dimensions.items()
        }


def _expand_role(role: str) -> list[str]:
    """Return all synonyms for a role including the role itself."""
    role_lower = role.lower()
    for canonical, synonyms in ROLE_SYNONYMS.items():
        if role_lower in synonyms or canonical in role_lower or role_lower in canonical:
            return synonyms
    return [role_lower]


def _score_role(title: str, target_roles: list[str]) -> DimensionResult:
    title_lower = title.lower()

    # Exact match
    for role in target_roles:
        if role.lower() in title_lower:
            return DimensionResult(35, 35, f"Title directly matches '{role}'")

    # Synonym expansion
    for role in target_roles:
        for syn in _expand_role(role):
            if syn in title_lower:
                return DimensionResult(30, 35, f"Title matches synonym of '{role}': '{syn}'")

    # Word-level partial (all significant words present)
    for role in target_roles:
        words = [w for w in role.lower().split() if len(w) > 3]
        if words and all(w in title_lower for w in words):
            return DimensionResult(22, 35, f"All key words of '{role}' found in title")

    # At least one significant word matches
    for role in target_roles:
        words = [w for w in role.lower().split() if len(w) > 4]
        matched_words = [w for w in words if w in title_lower]
        if matched_words:
            return DimensionResult(12, 35, f"Partial title match for '{role}': {', '.join(matched_words)}")

    return DimensionResult(0, 35, "No role keyword match in title")


def _score_skills(
    user_skills: list[str],
    resume_skills: list[str],
    jd_text: str,
) -> DimensionResult:
    user_set = {s.lower() for s in user_skills + resume_skills}
    if not user_set or not jd_text:
        return DimensionResult(0, 25, "No skills data available")

    # Extract tech keywords the JD explicitly requires
    jd_keywords = extract_tech_keywords_from_jd(jd_text)

    if jd_keywords:
        # Score = what % of what the JD requires does the user already know?
        matched = [kw for kw in jd_keywords if kw in user_set]
        ratio = len(matched) / len(jd_keywords)
        score = round(ratio * 25)
        if matched:
            explanation = (
                f"{len(matched)}/{len(jd_keywords)} required skills matched: "
                f"{', '.join(matched[:6])}"
            )
        else:
            explanation = f"None of the {len(jd_keywords)} JD skills found in your profile"
    else:
        # No recognisable tech terms — fall back to substring scan
        jd_lower = jd_text.lower()
        matched_list = [s for s in user_set if len(s) > 2 and s in jd_lower]
        ratio = len(matched_list) / max(len(user_set), 1)
        score = min(round(ratio * 25), 20)
        explanation = (
            f"{len(matched_list)} profile skills found in JD text"
            if matched_list
            else "No skills matched (JD has no recognised tech keywords)"
        )

    return DimensionResult(score, 25, explanation)


def _score_location(
    country_code: str | None,
    remote_option: str | None,
    target_countries: list[str],
    remote_preference: str,
) -> DimensionResult:
    # Fully remote jobs are globally accessible
    if remote_option == "remote":
        loc_score = 15
        loc_exp = "Fully remote — available globally"
    elif country_code in target_countries:
        loc_score = 15
        loc_exp = f"Country {country_code} matches your targets"
    elif country_code is None:
        loc_score = 5
        loc_exp = "Location not specified in listing"
    else:
        loc_score = 0
        loc_exp = f"Country {country_code} not in your targets"

    rp = remote_preference or "any"
    ro = remote_option or ""
    if rp == ro:
        pref_score, pref_exp = 5, f"Remote preference matches ({rp})"
    elif rp == "any":
        pref_score, pref_exp = 4, f"You accept any mode ({ro or 'unspecified'})"
    elif ro == "remote" and rp in ("remote", "hybrid"):
        pref_score, pref_exp = 4, "Remote fits your preference"
    else:
        pref_score, pref_exp = 1, f"Remote mismatch: job={ro}, you prefer {rp}"

    return DimensionResult(loc_score + pref_score, 20, f"{loc_exp}; {pref_exp}")


def _score_employment_type(
    job_type: str | None,
    user_types: list[str],
) -> DimensionResult:
    if not job_type:
        return DimensionResult(5, 10, "Employment type not specified in listing")

    normalised = job_type.lower().replace("-", "_").replace(" ", "_")
    user_normalised = [t.lower().replace("-", "_").replace(" ", "_") for t in user_types]

    if normalised in user_normalised:
        return DimensionResult(10, 10, f"Employment type '{job_type}' matches your preferences")

    # Common equivalents
    equiv: dict[str, str] = {
        "permanent": "full_time",
        "full-time": "full_time",
        "fixed_term": "contract",
        "temporary": "contract",
        "temp": "contract",
        "part-time": "part_time",
    }
    mapped = equiv.get(normalised, normalised)
    if mapped in user_normalised:
        return DimensionResult(8, 10, f"'{job_type}' equivalent to '{mapped}' — matches your preferences")

    return DimensionResult(0, 10, f"'{job_type}' not in your preferences: {', '.join(user_types)}")


def _score_experience(
    title: str,
    experience_years: int | None,
) -> DimensionResult:
    seniority = detect_seniority(title)
    if experience_years is None:
        return DimensionResult(5, 10, "Experience years not set in profile")

    if seniority == "senior":
        if experience_years >= 5:
            return DimensionResult(10, 10, f"Senior role matches your {experience_years}y experience")
        if experience_years >= 3:
            return DimensionResult(7, 10, f"Senior role, you have {experience_years}y (ideally 5+)")
        return DimensionResult(4, 10, f"Senior role but only {experience_years}y experience")

    if seniority == "junior":
        if experience_years <= 2:
            return DimensionResult(10, 10, f"Junior role matches your {experience_years}y experience")
        if experience_years <= 4:
            return DimensionResult(6, 10, f"Junior role — you may be overqualified ({experience_years}y)")
        return DimensionResult(3, 10, f"Junior role — significantly overqualified ({experience_years}y)")

    # mid-level
    if 2 <= experience_years <= 8:
        return DimensionResult(10, 10, f"Mid-level role fits your {experience_years}y experience")
    if experience_years < 2:
        return DimensionResult(6, 10, f"Mid-level role, you have {experience_years}y")
    return DimensionResult(8, 10, f"Mid-level role, you have {experience_years}y — strong fit")


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
    near_miss_threshold = profile.good_threshold - 15
    if near_miss_threshold <= total < profile.good_threshold:
        user_skills_lower = list({s.lower() for s in (profile.skills or []) + resume_skills})
        jd_keywords = extract_tech_keywords_from_jd(jd_text)
        gap_keywords = [kw for kw in jd_keywords if kw not in set(user_skills_lower)]
        result.near_miss_keywords = [
            assess_keyword_suitability(kw, user_skills_lower, profile.total_experience_years)
            for kw in gap_keywords[:10]
        ]

    return result
