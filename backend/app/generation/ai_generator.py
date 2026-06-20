"""AI-based document generation using OpenAI."""
from __future__ import annotations

from app.core.ai import get_openai_client
from app.models.opportunity import Opportunity
from app.models.profile import Profile
from app.models.resume import Resume

RESUME_PROMPT = """\
You are an expert technical resume writer. Your task is to tailor a candidate's resume for a specific job posting.

Rules:
- NEVER invent skills, experience, certifications, or education not present in the original resume.
- You MAY reorder, rephrase, and reprioritize existing content to best match the job description.
- Put the most relevant skills and experiences first.
- Keep the output as clean Markdown.
- Do not add commentary or explanations — return only the resume content.

Candidate profile:
{profile_section}

Original extracted resume data:
{resume_section}

Job posting:
Title: {title}
Company: {company}
Description:
{description}

Output a tailored resume in Markdown format."""

COVER_LETTER_PROMPT = """\
You are an expert cover letter writer. Write a professional, personalized cover letter for the candidate.

Rules:
- Base the letter ONLY on information provided — never invent skills or experience.
- Keep it to 3–4 short paragraphs.
- Be specific about why the candidate is a strong fit for this role.
- Return only the cover letter text in Markdown. No explanations.

Candidate:
{profile_section}

Experience summary:
{resume_section}

Job posting:
Title: {title}
Company: {company}
Description:
{description}"""


def _profile_section(profile: Profile) -> str:
    return (
        f"Name: {profile.display_name}\n"
        f"Target roles: {', '.join(profile.target_roles)}\n"
        f"Skills: {', '.join(profile.skills or [])}\n"
        f"Languages: {', '.join(profile.languages or [])}\n"
        f"Experience years: {profile.total_experience_years or 'unknown'}"
    )


def _resume_section(resume: Resume) -> str:
    extracted = resume.content_extracted or {}
    parts = []
    experience = extracted.get("experience", [])
    for exp in experience:
        parts.append(
            f"{exp.get('title')} at {exp.get('company')} ({exp.get('start_date')} – {exp.get('end_date') or 'Present'}): {exp.get('description', '')}"
        )
    education = extracted.get("education", [])
    for edu in education:
        parts.append(f"{edu.get('degree')} in {edu.get('field')} — {edu.get('institution')}")
    certs = extracted.get("certifications", [])
    for cert in certs:
        parts.append(f"Certification: {cert.get('name')} ({cert.get('issuer')})")
    return "\n".join(parts) if parts else "No structured experience data available."


async def generate_resume_ai(
    opportunity: Opportunity,
    profile: Profile,
    resume: Resume,
) -> str:
    client = get_openai_client()
    description = f"{opportunity.description or ''}\n{opportunity.requirements or ''}".strip()
    prompt = RESUME_PROMPT.format(
        profile_section=_profile_section(profile),
        resume_section=_resume_section(resume),
        title=opportunity.title,
        company=opportunity.company_name,
        description=description[:3000],
    )
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return response.choices[0].message.content or ""


async def generate_cover_letter_ai(
    opportunity: Opportunity,
    profile: Profile,
    resume: Resume,
) -> str:
    client = get_openai_client()
    description = f"{opportunity.description or ''}\n{opportunity.requirements or ''}".strip()
    prompt = COVER_LETTER_PROMPT.format(
        profile_section=_profile_section(profile),
        resume_section=_resume_section(resume),
        title=opportunity.title,
        company=opportunity.company_name,
        description=description[:3000],
    )
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
    )
    return response.choices[0].message.content or ""
