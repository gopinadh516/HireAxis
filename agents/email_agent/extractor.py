"""
Calls NVIDIA API (Llama 3.3-70B) to extract structured job data from email text.
Returns a list of jobs — one email can contain multiple requirements.
"""
import json
import logging
from openai import OpenAI
from config import NVIDIA_API_KEY, NVIDIA_BASE_URL, NVIDIA_MODEL

log = logging.getLogger(__name__)

client = OpenAI(base_url=NVIDIA_BASE_URL, api_key=NVIDIA_API_KEY)

SYSTEM_PROMPT = """You are an expert recruitment data extractor for an India-based staffing company.

Extract ALL job requirements from the email text. One email may have multiple positions.

Return a JSON object with this exact structure:
{
  "jobs": [
    {
      "title": "Job title (e.g. Java Developer, Full Stack Engineer)",
      "skills": ["skill1", "skill2", "skill3"],
      "experience_min": 2,
      "experience_max": 5,
      "location": "City name (e.g. Bangalore, Mumbai, Hyderabad)",
      "headcount": 1,
      "budget_min": null,
      "budget_max": null,
      "description": "Brief 1-2 sentence summary of the role"
    }
  ]
}

Rules:
- experience values are in YEARS (integers)
- budget/salary values are in LPA (Lakhs Per Annum, decimal numbers)
- headcount is how many people are needed (integer, default 1)
- skills should be specific technologies/tools, not soft skills
- if a field is not mentioned, use null
- always return valid JSON, nothing else
"""


def extract_jobs(email_text: str) -> list[dict]:
    """Returns list of extracted job dicts. Empty list if extraction fails."""
    try:
        response = client.chat.completions.create(
            model=NVIDIA_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"Extract job requirements from this email:\n\n{email_text}"},
            ],
            temperature=0.1,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        data = json.loads(raw)
        jobs = data.get("jobs", [])

        log.info(f"Extracted {len(jobs)} job(s) from email")
        return jobs

    except json.JSONDecodeError as e:
        log.error(f"AI returned invalid JSON: {e}")
        return []
    except Exception as e:
        log.error(f"NVIDIA API error: {e}")
        return []
