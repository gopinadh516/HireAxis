from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import supabase

router = APIRouter(prefix="/api/pulse", tags=["pulse"])


class NoteCreate(BaseModel):
    user_id: str
    content: str
    mentions: list[str] = []


@router.get("/users")
def mention_users():
    """All active users available for @mentions."""
    result = (
        supabase.table("users")
        .select("id,name,role")
        .eq("is_active", True)
        .order("name")
        .execute()
    )
    return result.data or []


@router.get("/{job_id}/notes")
def list_notes(job_id: str):
    result = (
        supabase.table("job_notes")
        .select("*, users(id,name)")
        .eq("job_id", job_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


@router.post("/{job_id}/notes", status_code=201)
def create_note(job_id: str, body: NoteCreate):
    result = supabase.table("job_notes").insert({
        "job_id": job_id,
        "user_id": body.user_id,
        "content": body.content,
        "mentions": body.mentions,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create note")

    note = result.data[0]

    if body.mentions:
        job_res = supabase.table("jobs").select("title,case_id").eq("id", job_id).single().execute()
        job_data = job_res.data or {}
        label = job_data.get("case_id") or job_data.get("title") or "a job"

        poster_res = supabase.table("users").select("name").eq("id", body.user_id).single().execute()
        poster_name = (poster_res.data or {}).get("name", "Someone")

        for uid in set(body.mentions):
            if uid == body.user_id:
                continue
            try:
                supabase.table("notifications").insert({
                    "user_id": uid,
                    "type": "pulse_mention",
                    "title": f"Mentioned by {poster_name}",
                    "message": f"{poster_name} mentioned you in a note on {label}",
                    "data": {"job_id": job_id},
                    "is_read": False,
                }).execute()
            except Exception:
                pass  # Don't block note creation if notification fails

    return note
