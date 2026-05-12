import os
from dotenv import load_dotenv

load_dotenv()

# Supabase
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# NVIDIA AI
NVIDIA_API_KEY = os.environ["NVIDIA_API_KEY"]
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL    = "meta/llama-3.3-70b-instruct"

# Email / IMAP
IMAP_HOST      = os.environ.get("IMAP_HOST", "imap.gmail.com")
IMAP_PORT      = int(os.environ.get("IMAP_PORT", "993"))
EMAIL_ADDRESS  = os.environ["EMAIL_ADDRESS"]
EMAIL_PASSWORD = os.environ["EMAIL_PASSWORD"]

# Manager to notify (UUID from users table)
MANAGER_USER_ID = os.environ.get("MANAGER_USER_ID", "")

# Keywords that mark an email as a job requirement
JOB_KEYWORDS = [
    "requirement", "requirements", "hiring", "opening", "openings",
    "vacancy", "vacancies", "position", "positions", "urgent hiring",
    "job opening", "job requirement", "talent requirement",
    "resource requirement", "staffing",
]
