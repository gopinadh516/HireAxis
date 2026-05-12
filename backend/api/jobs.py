from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import supabase

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    title: str
    skills: list[str] = []
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    location: Optional[str] = None
    headcount: int = 1
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    description: Optional[str] = None
    raw_email_text: Optional[str] = None
    source: str = "email"
    created_by: Optional[str] = None


class JobApprove(BaseModel):
    approved_by: str          # manager user id
    recruiter_id: str         # which recruiter to assign


@router.get("/")
def list_jobs(status: Optional[str] = None):
    query = supabase.table("jobs").select("*").order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return result.data


@router.get("/{job_id}")
def get_job(job_id: str):
    result = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data


@router.post("/", status_code=201)
def create_job(body: JobCreate):
    data = body.model_dump()
    data["status"] = "pending_approval"
    result = supabase.table("jobs").insert(data).execute()
    return result.data[0]


@router.patch("/{job_id}/approve")
def approve_job(job_id: str, body: JobApprove):
    from datetime import datetime, timezone

    # 1. Update job status → active
    job_result = supabase.table("jobs").update({
        "status": "active",
        "approved_by": body.approved_by,
        "approved_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()

    if not job_result.data:
        raise HTTPException(status_code=404, detail="Job not found")

    # 2. Create assignment record
    assignment = supabase.table("job_assignments").insert({
        "job_id": job_id,
        "recruiter_id": body.recruiter_id,
        "assigned_by": body.approved_by,
        "status": "pending",
    }).execute()

    # 3. Notify recruiter
    supabase.table("notifications").insert({
        "user_id": body.recruiter_id,
        "type": "job_assigned",
        "title": "New job assigned to you",
        "message": f"A new job has been approved and assigned to you.",
        "data": {"job_id": job_id},
        "is_read": False,
    }).execute()

    # 4. Notify manager (confirmation)
    supabase.table("notifications").insert({
        "user_id": body.approved_by,
        "type": "new_job_draft",
        "title": "Job approved",
        "message": "Job has been approved and recruiter notified.",
        "data": {"job_id": job_id},
        "is_read": False,
    }).execute()

    return {
        "job": job_result.data[0],
        "assignment": assignment.data[0],
    }


@router.patch("/{job_id}/reject")
def reject_job(job_id: str, rejected_by: str):
    result = supabase.table("jobs").update({
        "status": "closed",
    }).eq("id", job_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]
