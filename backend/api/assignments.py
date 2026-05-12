from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from db import supabase

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("/")
def list_assignments(recruiter_id: str):
    result = (
        supabase.table("job_assignments")
        .select("*, jobs(*)")
        .eq("recruiter_id", recruiter_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.patch("/{assignment_id}/start")
def start_search(assignment_id: str):
    """Recruiter clicks 'Start Search' — triggers AI candidate search."""
    result = supabase.table("job_assignments").update({
        "status": "searching",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", assignment_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment = result.data[0]

    # Update job status to 'searching'
    supabase.table("jobs").update({"status": "searching"}).eq("id", assignment["job_id"]).execute()

    return assignment


@router.patch("/{assignment_id}/complete")
def complete_assignment(assignment_id: str):
    result = supabase.table("job_assignments").update({
        "status": "completed",
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", assignment_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return result.data[0]
