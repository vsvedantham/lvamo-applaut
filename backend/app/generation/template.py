"""Template-based document generation — no AI required."""
from __future__ import annotations

from app.models.opportunity import Opportunity
from app.models.profile import Profile
from app.models.resume import Resume
from app.scoring.keywords import TECH_FAMILIES


def _matched_skills(profile_skills: list[str], jd_text: str) -> tuple[list[str], list[str]]:
    """Split profile skills into those mentioned in the JD and those not."""
    jd_lower = jd_text.lower()
    matched, rest = [], []
    for skill in profile_skills:
        if skill.lower() in jd_lower:
            matched.append(skill)
        else:
            rest.append(skill)
    return matched, rest


def _experience_summary(experience: list[dict]) -> str:
    if not experience:
        return ""
    most_recent = experience[0]
    return f"{most_recent.get('title', '')} at {most_recent.get('company', '')}"


def generate_resume(
    opportunity: Opportunity,
    profile: Profile,
    resume: Resume,
) -> str:
    extracted = resume.content_extracted or {}
    skills: list[str] = profile.skills or extracted.get("skills", [])
    experience: list[dict] = extracted.get("experience", [])
    education: list[dict] = extracted.get("education", [])
    certifications: list[dict] = extracted.get("certifications", [])
    languages: list[str] = profile.languages or extracted.get("languages", [])

    jd_text = f"{opportunity.title} {opportunity.description or ''} {opportunity.requirements or ''}"
    matched, rest = _matched_skills(skills, jd_text)

    lines: list[str] = []
    lines.append(f"# {profile.display_name}")
    lines.append("")

    if profile.target_roles:
        lines.append(f"**Target role:** {' · '.join(profile.target_roles)}")
        lines.append("")

    # Skills — relevant first
    lines.append("## Skills")
    if matched:
        lines.append(f"**Relevant:** {', '.join(matched)}")
    if rest:
        lines.append(f"**Other:** {', '.join(rest)}")
    lines.append("")

    # Experience
    if experience:
        lines.append("## Experience")
        for exp in experience:
            title = exp.get("title", "")
            company = exp.get("company", "")
            location = exp.get("location", "")
            start = exp.get("start_date", "")
            end = exp.get("end_date", "Present") or "Present"
            desc = exp.get("description", "")
            lines.append(f"### {title} — {company}")
            if location or start:
                meta = " | ".join(filter(None, [location, f"{start} – {end}"]))
                lines.append(f"*{meta}*")
            if desc:
                lines.append(desc)
            lines.append("")

    # Education
    if education:
        lines.append("## Education")
        for edu in education:
            degree = edu.get("degree", "")
            field = edu.get("field", "")
            institution = edu.get("institution", "")
            start = edu.get("start_date", "")
            end = edu.get("end_date", "") or "Present"
            heading = f"{degree} in {field}" if field else degree
            lines.append(f"### {heading}")
            if institution or start:
                meta = " | ".join(filter(None, [institution, f"{start} – {end}"]))
                lines.append(f"*{meta}*")
            lines.append("")

    # Certifications
    if certifications:
        lines.append("## Certifications")
        for cert in certifications:
            name = cert.get("name", "")
            issuer = cert.get("issuer", "")
            date = cert.get("date", "")
            entry = f"- **{name}**"
            if issuer:
                entry += f" — {issuer}"
            if date:
                entry += f" ({date})"
            lines.append(entry)
        lines.append("")

    # Languages
    if languages:
        lines.append("## Languages")
        lines.append(", ".join(languages))
        lines.append("")

    return "\n".join(lines)


def generate_cover_letter(
    opportunity: Opportunity,
    profile: Profile,
    resume: Resume,
) -> str:
    extracted = resume.content_extracted or {}
    skills: list[str] = profile.skills or extracted.get("skills", [])
    experience: list[dict] = extracted.get("experience", [])
    certifications: list[dict] = extracted.get("certifications", [])

    jd_text = f"{opportunity.title} {opportunity.description or ''} {opportunity.requirements or ''}"
    matched, _ = _matched_skills(skills, jd_text)
    top_skills = matched[:5] or skills[:5]

    exp_years = profile.total_experience_years
    exp_phrase = f"over {exp_years} years of professional experience" if exp_years else "professional experience"
    exp_summary = _experience_summary(experience)

    top_roles = profile.target_roles[:2] if profile.target_roles else ["this field"]
    field = top_roles[0]

    cert_line = ""
    if certifications:
        names = [c.get("name", "") for c in certifications[:3] if c.get("name")]
        if names:
            cert_line = f"\nI also hold the following relevant certifications: {', '.join(names)}.\n"

    skills_str = ", ".join(top_skills) if top_skills else "relevant technologies"

    lines: list[str] = [
        "Dear Hiring Manager,",
        "",
        f"I am writing to express my strong interest in the **{opportunity.title}** position at **{opportunity.company_name}**.",
        "",
        f"With {exp_phrase} in {field}, I bring a proven skill set in {skills_str}.",
        f"My background includes {exp_summary}, where I developed the technical and collaborative competencies that make me a strong fit for this role.",
        cert_line,
        f"I am drawn to this opportunity at {opportunity.company_name} because it aligns directly with my expertise in {', '.join(top_skills[:3]) if top_skills else field}. "
        "I am confident that I can make a meaningful contribution from day one.",
        "",
        "I would welcome the opportunity to discuss how my background aligns with your team's goals.",
        "",
        "Sincerely,",
        profile.display_name,
    ]
    return "\n".join(lines)
