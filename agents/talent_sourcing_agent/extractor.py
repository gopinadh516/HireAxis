import json
from openai import OpenAI
from config import NVIDIA_API_KEY, NVIDIA_BASE_URL, NVIDIA_MODEL

_client = OpenAI(base_url=NVIDIA_BASE_URL, api_key=NVIDIA_API_KEY)

_PROMPT = """You are a talent data extractor. Given a search result snippet from a job board or professional profile site, extract candidate information.

Return ONLY valid JSON — no markdown, no explanation, no code fences.

JSON shape (use null for missing fields):
{
  "first_name": string | null,
  "last_name": string | null,
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "current_title": string | null,
  "current_company": string | null,
  "total_experience": number | null,
  "linkedin_url": string | null,
  "skills": [string],
  "city": string | null,
  "state": string | null,
  "country": string | null
}

Search result:
"""


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def extract(result: dict) -> dict | None:
    """
    Given a search result dict {title, snippet, link}, ask NVIDIA AI to extract
    a structured talent profile. Returns dict or None on failure.
    """
    text = f"Title: {result['title']}\nURL: {result['link']}\nSnippet: {result['snippet']}"
    try:
        response = _client.chat.completions.create(
            model=NVIDIA_MODEL,
            messages=[{"role": "user", "content": _PROMPT + text}],
            temperature=0.1,
            max_tokens=800,
        )
        raw = response.choices[0].message.content or ""
        parsed = json.loads(_strip_fences(raw))
        # Attach the source URL
        parsed["linkedin_url"] = parsed.get("linkedin_url") or (
            result["link"] if "linkedin.com/in" in result["link"] else None
        )
        parsed["_source_url"] = result["link"]
        return parsed
    except Exception as e:
        print(f"[extractor] Failed to extract from '{result['link']}': {e}")
        return None
