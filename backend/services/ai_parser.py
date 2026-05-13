import os
import io
import json
import fitz  # PyMuPDF
import mammoth
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

_client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ["NVIDIA_API_KEY"],
)

_PROMPT = """Extract candidate information from the resume text below. Return ONLY valid JSON — no markdown, no explanation.

Required JSON shape (use null for any missing field):
{
  "first_name": string | null,
  "last_name": string | null,
  "email": string | null,
  "phone": string | null,
  "current_title": string | null,
  "current_company": string | null,
  "total_experience": number | null,
  "linkedin_url": string | null,
  "city": string | null,
  "state": string | null,
  "country": string | null,
  "visa_status": "USC"|"GC"|"GC_EAD"|"H1B"|"H4_EAD"|"L1"|"L2_EAD"|"F1_OPT"|"F1_CPT"|"STEM_OPT"|"TN"|"E3"|"O1"|"J1"|"EAD"|"OTHER"|null,
  "summary": string | null,
  "skills": [{"skill": string, "level": "BEGINNER"|"INTERMEDIATE"|"ADVANCED"|"EXPERT"|null, "years_of_exp": number|null}]
}

Resume:
"""


def _extract_text(content: bytes, mime_type: str) -> str:
    if "pdf" in mime_type:
        doc = fitz.open(stream=content, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)
    if "word" in mime_type or mime_type.endswith(".docx"):
        result = mammoth.extract_raw_text(io.BytesIO(content))
        return result.value
    raise ValueError(f"Unsupported file type: {mime_type}")


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


async def parse_resume(content: bytes, mime_type: str) -> dict:
    text = _extract_text(content, mime_type)
    response = await _client.chat.completions.create(
        model="meta/llama-3.3-70b-instruct",
        messages=[{"role": "user", "content": _PROMPT + text[:8000]}],
        temperature=0.1,
        max_tokens=2000,
    )
    raw = response.choices[0].message.content or ""
    return json.loads(_strip_fences(raw))


_SUMMARY_PROMPT = """You are an expert technical recruiter. Read this resume carefully and produce a structured recruiter briefing.

Return ONLY valid JSON — no markdown fences, no explanation, no extra text.

JSON shape (use empty arrays or null for missing data, never omit keys):
{
  "overview": "2-3 sentence professional overview — who they are, what they do, total experience",
  "current_role": "Current Title @ Current Company or null",
  "total_experience_years": number or null,
  "professional_experience": [
    {
      "company": "Company name",
      "role": "Job title",
      "duration": "Start – End (e.g. Jan 2020 – Mar 2023)",
      "highlights": ["Key achievement or responsibility 1", "Key achievement or responsibility 2"]
    }
  ],
  "clients_and_vendors": ["List every client name, end-client, or major vendor/technology partner mentioned"],
  "technical_skills": {
    "primary": ["Top 5-8 core technical skills"],
    "secondary": ["Other technical skills"],
    "tools_platforms": ["Tools, cloud platforms, databases, CI/CD, frameworks"]
  },
  "education": [
    {"degree": "Degree name", "institution": "University/College", "year": "Graduation year or null"}
  ],
  "certifications": ["Certification name and issuer"],
  "key_strengths": ["3-5 standout strengths relevant to a recruiter"]
}

Resume text:
"""


async def generate_recruiter_summary(content: bytes, mime_type: str) -> dict:
    text = _extract_text(content, mime_type)
    response = await _client.chat.completions.create(
        model="meta/llama-3.3-70b-instruct",
        messages=[{"role": "user", "content": _SUMMARY_PROMPT + text[:12000]}],
        temperature=0.2,
        max_tokens=3500,
    )
    raw = response.choices[0].message.content or ""
    return json.loads(_strip_fences(raw))
