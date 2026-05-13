import requests
from config import GOOGLE_API_KEY, GOOGLE_CSE_ID, SEARCH_SITES

_CSE_URL = "https://customsearch.googleapis.com/customsearch/v1"


def search(query: str, num: int = 10) -> list[dict]:
    """
    Run a Google Custom Search and return a list of result dicts:
    [{title, snippet, link}, ...]
    """
    full_query = f"{query} {SEARCH_SITES}"
    try:
        resp = requests.get(
            _CSE_URL,
            params={"key": GOOGLE_API_KEY, "cx": GOOGLE_CSE_ID, "q": full_query, "num": min(num, 10)},
            timeout=15,
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])
        return [
            {
                "title":   item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "link":    item.get("link", ""),
            }
            for item in items
        ]
    except Exception as e:
        print(f"[searcher] Google CSE error for '{query}': {e}")
        return []


def build_job_query(job_title: str, skills: list[str]) -> str:
    skill_str = " ".join(skills[:4])
    return f'"{job_title}" {skill_str} resume'


def build_general_query(term: str) -> str:
    return term
