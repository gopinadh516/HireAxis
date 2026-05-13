from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_db: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def _already_exists(email: str | None, linkedin_url: str | None) -> str | None:
    """Return existing talent id if found by email or linkedin_url, else None."""
    if email:
        res = _db.table("talents").select("id").eq("email", email).limit(1).execute()
        if res.data:
            return res.data[0]["id"]
    if linkedin_url:
        res = _db.table("talents").select("id").eq("linkedin_url", linkedin_url).limit(1).execute()
        if res.data:
            return res.data[0]["id"]
    return None


def save(talent_data: dict, job_id: str | None = None) -> str | None:
    """
    Dedup by email or linkedin_url.
    Insert new talent with source=JOB_BOARD, channel=AGENT.
    If job_id provided, also link talent to that job via job_talents.
    Returns talent_id or None.
    """
    email       = talent_data.get("email")
    linkedin    = talent_data.get("linkedin_url")
    source_url  = talent_data.get("_source_url", "")

    # Skip if neither email nor linkedin — can't dedup
    if not email and not linkedin:
        print(f"[saver] Skipping — no email or linkedin_url: {talent_data.get('name')}")
        return None

    existing_id = _already_exists(email, linkedin)
    if existing_id:
        print(f"[saver] Already in pool: {talent_data.get('name')} ({existing_id})")
        talent_id = existing_id
    else:
        # Build name
        name = talent_data.get("name") or (
            f"{talent_data.get('first_name', '')} {talent_data.get('last_name', '')}".strip()
        ) or "Unknown"

        row = {
            "name":             name,
            "first_name":       talent_data.get("first_name"),
            "last_name":        talent_data.get("last_name"),
            "email":            email,
            "phone":            talent_data.get("phone"),
            "current_title":    talent_data.get("current_title"),
            "current_company":  talent_data.get("current_company"),
            "total_experience": talent_data.get("total_experience"),
            "linkedin_url":     linkedin,
            "skills":           talent_data.get("skills", []),
            "city":             talent_data.get("city"),
            "state":            talent_data.get("state"),
            "country":          talent_data.get("country"),
            "talent_source":    "JOB_BOARD",
            "channel":          "AGENT",
            "approval_status":  "PENDING",
            "is_marketable":    False,
        }
        # Remove None values so DB defaults apply
        row = {k: v for k, v in row.items() if v is not None}

        res = _db.table("talents").insert(row).execute()
        if not res.data:
            print(f"[saver] Failed to insert talent: {name}")
            return None
        talent_id = res.data[0]["id"]
        print(f"[saver] Added talent: {name} ({talent_id})")

    # Link to job if provided
    if job_id and talent_id:
        existing_link = (
            _db.table("job_talents")
            .select("id")
            .eq("job_id", job_id)
            .eq("talent_id", talent_id)
            .limit(1)
            .execute()
        )
        if not existing_link.data:
            _db.table("job_talents").insert({
                "job_id":    job_id,
                "talent_id": talent_id,
                "added_by":  "ai",
            }).execute()

    return talent_id
