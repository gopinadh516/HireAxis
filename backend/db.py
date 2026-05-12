import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ["SUPABASE_URL"]

# Python supabase client requires a JWT key (eyJ...).
# Use service_role key for backend (bypasses RLS).
# Falls back to anon key if service key not set.
key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ["SUPABASE_ANON_KEY"]

if not key.startswith("eyJ"):
    raise RuntimeError(
        "Backend requires a JWT API key (starts with 'eyJ...').\n"
        "Go to Supabase → Settings → API → service_role key and add it to backend/.env as SUPABASE_SERVICE_KEY"
    )

supabase: Client = create_client(url, key)
