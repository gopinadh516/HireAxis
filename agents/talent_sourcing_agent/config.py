import os
from dotenv import load_dotenv

load_dotenv()

# Supabase
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# NVIDIA AI
NVIDIA_API_KEY  = os.environ["NVIDIA_API_KEY"]
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL    = "meta/llama-3.3-70b-instruct"

# Google Custom Search
GOOGLE_API_KEY = os.environ["GOOGLE_API_KEY"]
GOOGLE_CSE_ID  = os.environ["GOOGLE_CSE_ID"]

# Scheduling
SCAN_INTERVAL_SECONDS = int(os.environ.get("SCAN_INTERVAL_SECONDS", "3600"))
TASK_POLL_SECONDS     = int(os.environ.get("TASK_POLL_SECONDS", "30"))

# General search terms for scheduled scan (comma-separated in env)
_raw_terms = os.environ.get(
    "SEARCH_TERMS",
    "React developer,Java engineer,Python developer,Data engineer,Node.js developer"
)
SEARCH_TERMS = [t.strip() for t in _raw_terms.split(",") if t.strip()]

# Sites to search (appended to every query)
SEARCH_SITES = "site:linkedin.com/in OR site:naukri.com OR site:dice.com"
