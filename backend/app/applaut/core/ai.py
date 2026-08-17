import json
from openai import OpenAI

from app.config import settings

_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


EXTRACTION_PROMPT = """
You are a resume parser. Extract structured information from the resume text below.

Return ONLY valid JSON with this exact structure:
{
  "skills": ["skill1", "skill2"],
  "languages": ["language1"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null if current",
      "description": "Brief summary of responsibilities"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "field": "Field of Study",
      "start_date": "YYYY",
      "end_date": "YYYY or null if ongoing"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "YYYY-MM or YYYY"
    }
  ]
}

Rules:
- Only extract information explicitly present in the resume. Never invent or infer details.
- If a section has no entries, return an empty array.
- Skills should be individual technologies, tools, or competencies (not soft skills).
- Languages should be spoken/written languages only.

Resume text:
"""


def extract_resume_data(text: str) -> dict:
    client = get_openai_client()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": EXTRACTION_PROMPT + text},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)
