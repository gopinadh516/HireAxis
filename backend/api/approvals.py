from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from db import supabase

router = APIRouter(prefix="/api/approvals", tags=["approvals"])

MANAGER_ID = os.environ.get("ADMIN_USER_ID", "b640078d-41a4-4f2c-8255-26d33a1c85bb")


@router.get("/pending-jobs-count")
def pending_jobs_count():
    result = (
        supabase.table("jobs")
        .select("id", count="exact")
        .eq("status", "pending_approval")
        .execute()
    )
    return {"count": result.count or 0}


@router.get("/pending-jobs")
def pending_jobs():
    result = (
        supabase.table("jobs")
        .select("*")
        .eq("status", "pending_approval")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


class JobApproveBody(BaseModel):
    recruiter_id: str


@router.patch("/jobs/{job_id}/approve")
def approve_job(job_id: str, body: JobApproveBody):
    from datetime import datetime, timezone

    job_result = supabase.table("jobs").update({
        "status": "active",
        "approved_by": MANAGER_ID,
        "approved_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()

    if not job_result.data:
        raise HTTPException(status_code=404, detail="Job not found")

    assignment = supabase.table("job_assignments").insert({
        "job_id": job_id,
        "recruiter_id": body.recruiter_id,
        "assigned_by": MANAGER_ID,
        "status": "pending",
    }).execute()

    supabase.table("notifications").insert({
        "user_id": body.recruiter_id,
        "type": "job_assigned",
        "title": "New job assigned to you",
        "message": "A new job has been approved and assigned to you.",
        "data": {"job_id": job_id},
        "is_read": False,
    }).execute()

    return {"job": job_result.data[0], "assignment": assignment.data[0]}


@router.patch("/jobs/{job_id}/reject")
def reject_job(job_id: str):
    result = supabase.table("jobs").update({
        "status": "closed",
    }).eq("id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]


@router.get("/recruiters")
def list_recruiters():
    result = (
        supabase.table("users")
        .select("id,name,email,role")
        .eq("is_active", True)
        .execute()
    )
    return result.data
