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
    recruiter_id: Optional[str] = None   # only used when source="manual"


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
    from datetime import datetime, timezone

    recruiter_id = body.recruiter_id
    data = body.model_dump(exclude_none=True)
    data.pop("recruiter_id", None)  # not a jobs column

    if body.source == "manual":
        # Manager created directly — skip approval queue
        data["status"] = "active"
        data["approved_by"] = body.created_by
        data["approved_at"] = datetime.now(timezone.utc).isoformat()
    else:
        data["status"] = "pending_approval"

    result = supabase.table("jobs").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create job")
    job = result.data[0]

    if body.source == "manual" and recruiter_id:
        supabase.table("job_assignments").insert({
            "job_id": job["id"],
            "recruiter_id": recruiter_id,
            "assigned_by": body.created_by,
            "status": "pending",
        }).execute()
        supabase.table("notifications").insert({
            "user_id": recruiter_id,
            "type": "job_assigned",
            "title": "New job assigned to you",
            "message": f"You have been assigned to: {job['title']}",
            "data": {"job_id": job["id"]},
            "is_read": False,
        }).execute()

    return job


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


class SourceTalentsBody(BaseModel):
    triggered_by: Optional[str] = None


@router.post("/{job_id}/source-talents", status_code=201)
def source_talents(job_id: str, body: SourceTalentsBody = SourceTalentsBody()):
    job = supabase.table("jobs").select("id").eq("id", job_id).limit(1).execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")

    task = supabase.table("sourcing_tasks").insert({
        "job_id":       job_id,
        "triggered_by": body.triggered_by,
        "status":       "queued",
    }).execute()

    return {"task_id": task.data[0]["id"], "status": "queued"}


@router.get("/{job_id}/sourcing-status")
def sourcing_status(job_id: str):
    result = (
        supabase.table("sourcing_tasks")
        .select("*")
        .eq("job_id", job_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return {"status": None}
    return result.data[0]
