from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import os
from db import supabase

MANAGER_ID = os.environ.get("ADMIN_USER_ID", "b640078d-41a4-4f2c-8255-26d33a1c85bb")

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


# ── Pydantic models ──────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    # Original fields (email-agent compat)
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
    source: str = "manual"
    created_by: Optional[str] = None
    recruiter_id: Optional[str] = None  # assignment only, not a jobs column

    # New rich fields
    job_type: str = "FULL_TIME"          # FULL_TIME | PART_TIME | CONTRACT | CONTRACT_TO_HIRE | TEMPORARY | INTERNSHIP | W2
    work_mode: str = "ONSITE"            # ONSITE | REMOTE | HYBRID
    job_status: str = "OPEN"             # DRAFT | OPEN | CLOSED | ON_HOLD
    is_active: bool = True
    company: Optional[str] = None
    channel: str = "PORTAL"              # PORTAL | WEBSITE
    approval_status: str = "APPROVED"
    approval_note: Optional[str] = None

    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str = "USD"
    pay_rate_min: Optional[float] = None
    pay_rate_max: Optional[float] = None
    bill_rate_min: Optional[float] = None
    bill_rate_max: Optional[float] = None

    required_skills: list[str] = []
    nice_to_have: list[str] = []
    visa_requirements: list[str] = []

    due_date: Optional[str] = None
    application_deadline: Optional[str] = None
    openings: int = 1

    client_name: Optional[str] = None
    client_contact: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None

    end_client_name: Optional[str] = None
    end_client_contact: Optional[str] = None
    end_client_email: Optional[str] = None
    end_client_phone: Optional[str] = None

    vendor_name: Optional[str] = None
    vendor_contact: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_phone: Optional[str] = None

    posted_by_id: Optional[str] = None

    submitted_by_name: Optional[str] = None
    submitted_by_email: Optional[str] = None
    submitted_by_phone: Optional[str] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    skills: Optional[list[str]] = None
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    location: Optional[str] = None
    headcount: Optional[int] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    description: Optional[str] = None

    job_type: Optional[str] = None
    work_mode: Optional[str] = None
    job_status: Optional[str] = None
    is_active: Optional[bool] = None
    company: Optional[str] = None
    approval_note: Optional[str] = None

    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    pay_rate_min: Optional[float] = None
    pay_rate_max: Optional[float] = None
    bill_rate_min: Optional[float] = None
    bill_rate_max: Optional[float] = None
    internal_bill_rate: Optional[float] = None
    bill_rate_margin: Optional[float] = None

    required_skills: Optional[list[str]] = None
    nice_to_have: Optional[list[str]] = None
    visa_requirements: Optional[list[str]] = None

    due_date: Optional[str] = None
    application_deadline: Optional[str] = None
    openings: Optional[int] = None

    client_name: Optional[str] = None
    client_contact: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None

    end_client_name: Optional[str] = None
    end_client_contact: Optional[str] = None
    end_client_email: Optional[str] = None
    end_client_phone: Optional[str] = None

    vendor_name: Optional[str] = None
    vendor_contact: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_phone: Optional[str] = None

    submitted_by_name: Optional[str] = None
    submitted_by_email: Optional[str] = None
    submitted_by_phone: Optional[str] = None


class JobApprove(BaseModel):
    approved_by: str
    recruiter_id: str


class SourceTalentsBody(BaseModel):
    triggered_by: Optional[str] = None


class InitiateCaseRequest(BaseModel):
    recruiter_id: Optional[str] = None
    bill_rate_margin: float = 15.0
    internal_bill_rate: Optional[float] = None


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("/")
def list_jobs(
    search: Optional[str] = None,
    status: Optional[str] = None,
    job_status: Optional[str] = None,
    job_type: Optional[str] = None,
    work_mode: Optional[str] = None,
    is_active: Optional[bool] = None,
    approval_status: Optional[str] = None,
    source: Optional[str] = None,
    channel: Optional[str] = None,
    pending_only: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = supabase.table("jobs").select("*", count="exact")

    if search:
        s = search.strip()
        query = query.or_(
            f"title.ilike.%{s}%,company.ilike.%{s}%,location.ilike.%{s}%,"
            f"description.ilike.%{s}%,end_client_name.ilike.%{s}%"
        )
    if status:
        query = query.eq("status", status)
    if pending_only:
        query = query.in_("job_status", ["NEW", "PENDING_VALIDATION"])
    elif job_status:
        query = query.eq("job_status", job_status)
    if job_type:
        query = query.eq("job_type", job_type)
    if work_mode:
        query = query.eq("work_mode", work_mode)
    if is_active is not None:
        query = query.eq("is_active", is_active)
    if approval_status:
        query = query.eq("approval_status", approval_status)
    if source:
        query = query.eq("source", source)
    if channel:
        query = query.eq("channel", channel)

    offset = (page - 1) * page_size
    result = (
        query.order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return {"items": result.data, "total": result.count or 0, "page": page, "page_size": page_size}


# ── Basket counts ─────────────────────────────────────────────────────────────

@router.get("/basket-counts")
def basket_counts():
    result = supabase.table("jobs").select("source, channel, status, job_status").execute()
    rows = result.data or []

    def bucket(job):
        if job.get("source") == "email":
            return "email"
        if job.get("channel") == "WEBSITE":
            return "website"
        if job.get("channel") == "AI_SEARCH":
            return "ai_search"
        return "internal"

    counts = {k: {"total": 0, "new": 0, "validating": 0, "active": 0, "closed": 0}
              for k in ["email", "website", "internal", "ai_search"]}

    for job in rows:
        b = bucket(job)
        counts[b]["total"] += 1
        js = job.get("job_status") or ""
        s  = job.get("status") or ""
        if s == "closed" or js == "CLOSED":
            counts[b]["closed"] += 1
        elif s in ("active", "searching") or js == "OPEN":
            counts[b]["active"] += 1
        elif js == "PENDING_VALIDATION":
            counts[b]["validating"] += 1
        else:
            counts[b]["new"] += 1

    return counts


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_job(body: JobCreate):
    from datetime import datetime, timezone

    recruiter_id = body.recruiter_id
    data = body.model_dump(exclude_none=True)
    data.pop("recruiter_id", None)

    # Jobs enter the case pipeline directly — no separate approval queue
    data["status"] = "active"
    data["approval_status"] = "APPROVED"
    data["job_status"] = "NEW"
    data["is_active"] = True
    data.pop("approved_by", None)
    data.pop("approved_at", None)

    # For internal jobs, auto-fill submitter details from the creator's profile
    if data.get("source") == "manual" and data.get("created_by"):
        missing = not data.get("submitted_by_name") and not data.get("submitted_by_email")
        if missing:
            user_row = supabase.table("users").select("name,email,phone").eq("id", data["created_by"]).single().execute()
            if user_row.data:
                u = user_row.data
                if not data.get("submitted_by_name"):
                    data["submitted_by_name"] = u.get("name")
                if not data.get("submitted_by_email"):
                    data["submitted_by_email"] = u.get("email")
                if not data.get("submitted_by_phone"):
                    data["submitted_by_phone"] = u.get("phone")

    result = supabase.table("jobs").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create job")
    job = result.data[0]

    return job


# ── Get single ────────────────────────────────────────────────────────────────

@router.get("/{job_id}")
def get_job(job_id: str):
    result = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{job_id}")
def update_job(job_id: str, body: JobUpdate):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("jobs").update(data).eq("id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]


# ── Toggle is_active ──────────────────────────────────────────────────────────

@router.patch("/{job_id}/start-validation")
def start_validation(job_id: str):
    result = supabase.table("jobs").select("id, job_status").eq("id", job_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    supabase.table("jobs").update({"job_status": "PENDING_VALIDATION"}).eq("id", job_id).execute()
    return {"id": job_id, "job_status": "PENDING_VALIDATION"}


class AssignValidatorBody(BaseModel):
    manager_id: str
    assigned_by: str


@router.post("/{job_id}/assign-validator", status_code=201)
def assign_validator(job_id: str, body: AssignValidatorBody):
    """Assign or reassign validation of a job to a manager."""
    # Remove any existing reviewing assignments for this job
    supabase.table("job_assignments").delete().eq("job_id", job_id).eq("status", "reviewing").execute()

    # Create new assignment
    result = supabase.table("job_assignments").insert({
        "job_id": job_id,
        "recruiter_id": body.manager_id,
        "assigned_by": body.assigned_by,
        "status": "reviewing",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create assignment")

    # Notify the assigned manager (skip self-assignment)
    if body.manager_id != body.assigned_by:
        job_res = supabase.table("jobs").select("title,case_id").eq("id", job_id).single().execute()
        job_data = job_res.data or {}
        label = job_data.get("case_id") or job_data.get("title") or "a job"

        assigner_res = supabase.table("users").select("name").eq("id", body.assigned_by).single().execute()
        assigner_name = (assigner_res.data or {}).get("name", "Someone")

        try:
            supabase.table("notifications").insert({
                "user_id": body.manager_id,
                "type": "job_assigned",
                "title": f"Validation assigned by {assigner_name}",
                "message": f"{assigner_name} assigned you to validate {label}",
                "data": {"job_id": job_id},
                "is_read": False,
            }).execute()
        except Exception:
            pass

    return result.data[0]


@router.patch("/{job_id}/toggle")
def toggle_active(job_id: str):
    job = supabase.table("jobs").select("is_active").eq("id", job_id).single().execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")
    new_active = not job.data.get("is_active", True)
    result = supabase.table("jobs").update({"is_active": new_active}).eq("id", job_id).execute()
    return {"id": job_id, "is_active": new_active}


# ── Soft delete ───────────────────────────────────────────────────────────────

@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: str):
    supabase.table("jobs").update({"job_status": "CLOSED", "is_active": False}).eq("id", job_id).execute()


# ── Approve / Reject (email workflow) ─────────────────────────────────────────

@router.patch("/{job_id}/approve")
def approve_job(job_id: str, body: JobApprove):
    from datetime import datetime, timezone

    job_result = supabase.table("jobs").update({
        "status": "active",
        "approved_by": body.approved_by,
        "approved_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()

    if not job_result.data:
        raise HTTPException(status_code=404, detail="Job not found")

    assignment = supabase.table("job_assignments").insert({
        "job_id": job_id,
        "recruiter_id": body.recruiter_id,
        "assigned_by": body.approved_by,
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

    supabase.table("notifications").insert({
        "user_id": body.approved_by,
        "type": "new_job_draft",
        "title": "Job approved",
        "message": "Job has been approved and recruiter notified.",
        "data": {"job_id": job_id},
        "is_read": False,
    }).execute()

    return {"job": job_result.data[0], "assignment": assignment.data[0]}


@router.patch("/{job_id}/reject")
def reject_job(job_id: str, rejected_by: Optional[str] = None):
    result = supabase.table("jobs").update({"status": "closed"}).eq("id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]


# ── Sourcing ──────────────────────────────────────────────────────────────────

@router.post("/{job_id}/source-talents", status_code=201)
def source_talents(job_id: str, body: SourceTalentsBody = SourceTalentsBody()):
    job = supabase.table("jobs").select("id").eq("id", job_id).limit(1).execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")

    task = supabase.table("sourcing_tasks").insert({
        "job_id": job_id,
        "triggered_by": body.triggered_by,
        "status": "queued",
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


# ── Pool Matching ─────────────────────────────────────────────────────────────

@router.get("/{job_id}/pool-matches")
def get_pool_matches(job_id: str):
    job = supabase.table("jobs") \
        .select("required_skills,skills,experience_min,experience_max,visa_requirements") \
        .eq("id", job_id).single().execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")

    job_skills = {s.lower() for s in (job.data.get("required_skills") or job.data.get("skills") or [])}
    exp_min = job.data.get("experience_min")
    exp_max = job.data.get("experience_max")
    visa_req = set(job.data.get("visa_requirements") or [])

    talents = supabase.table("talents") \
        .select("id,name,first_name,last_name,email,current_title,current_company,total_experience,experience_years,skills,visa_status,location,linkedin_url") \
        .eq("approval_status", "APPROVED").execute()

    results = []
    for t in talents.data:
        t_skills = {s.lower() for s in (t.get("skills") or [])}
        skill_score = (len(job_skills & t_skills) / len(job_skills)) * 70 if job_skills else 35
        exp = float(t.get("total_experience") or t.get("experience_years") or 0)
        if exp_min is not None and exp_max is not None:
            exp_score = 20 if exp_min <= exp <= exp_max else (10 if exp >= exp_min else 0)
        elif exp_min is not None:
            exp_score = 20 if exp >= exp_min else 0
        else:
            exp_score = 10
        visa_score = 10 if (not visa_req or t.get("visa_status") in visa_req) else 0
        match_score = int(skill_score + exp_score + visa_score)
        if match_score >= 20:
            results.append({
                **t,
                "match_score": match_score,
                "matched_skills": list(job_skills & t_skills),
            })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results[:50]


# ── Job Assignments lookup ────────────────────────────────────────────────────

@router.get("/{job_id}/assignments")
def get_job_assignments(job_id: str):
    result = supabase.table("job_assignments") \
        .select("*, users!job_assignments_recruiter_id_fkey(id,name,email)") \
        .eq("job_id", job_id).order("created_at", desc=True).execute()
    return result.data


# ── Job Talents (pipeline finalize/interview stages) ─────────────────────────

class JobTalentStatusBody(BaseModel):
    status: str

@router.get("/{job_id}/job-talents")
def list_job_talents(job_id: str, status: Optional[str] = None):
    query = supabase.table("job_talents") \
        .select("*, talents(id,name,first_name,last_name,current_title,current_company,total_experience,experience_years,visa_status,skills)") \
        .eq("job_id", job_id)
    if status:
        query = query.eq("status", status)
    result = query.order("created_at").execute()
    return result.data

@router.patch("/{job_id}/job-talents/{jt_id}")
def update_job_talent(job_id: str, jt_id: str, body: JobTalentStatusBody):
    result = supabase.table("job_talents").update({"status": body.status}).eq("id", jt_id).eq("job_id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job talent not found")
    return result.data[0]


# ── Initiate Case ─────────────────────────────────────────────────────────────

@router.post("/{job_id}/initiate-case")
def initiate_case(job_id: str, body: InitiateCaseRequest):
    from datetime import datetime, timezone

    job = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")

    # Generate sequential case_id
    count_result = supabase.table("jobs").select("id", count="exact") \
        .not_.is_("case_id", "null").execute()
    case_number = (count_result.count or 0) + 1
    case_id = f"Job-{case_number:05d}"

    # Calculate internal_bill_rate
    customer_rate = job.data.get("bill_rate_max") or job.data.get("bill_rate_min") or 0
    internal_rate = body.internal_bill_rate
    if internal_rate is None and customer_rate:
        internal_rate = round(float(customer_rate) * (1 - body.bill_rate_margin / 100), 2)

    # Activate the job with case metadata
    supabase.table("jobs").update({
        "case_id": case_id,
        "status": "active",
        "job_status": "OPEN",
        "approval_status": "APPROVED",
        "is_active": True,
        "approved_by": MANAGER_ID,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "internal_bill_rate": internal_rate,
        "bill_rate_margin": body.bill_rate_margin,
        "pipeline_stage": "search",
    }).eq("id", job_id).execute()

    # Create assignment + notify only when a recruiter is specified
    if body.recruiter_id:
        supabase.table("job_assignments").insert({
            "job_id": job_id,
            "recruiter_id": body.recruiter_id,
            "assigned_by": MANAGER_ID,
            "status": "pending",
        }).execute()

        supabase.table("notifications").insert({
            "user_id": body.recruiter_id,
            "type": "job_assigned",
            "title": f"New case assigned: {case_id}",
            "message": f"You have a new case: {job.data.get('title', '')}",
            "data": {"job_id": job_id, "case_id": case_id},
            "is_read": False,
        }).execute()

    return {"case_id": case_id, "job_id": job_id}


# ── Pipeline Stage ────────────────────────────────────────────────────────────

STAGE_ORDER = ["validate", "search", "finalize", "internal_interview", "client_interview", "onboard", "closed"]

class PipelineStageBody(BaseModel):
    stage: str

@router.patch("/{job_id}/pipeline-stage")
def advance_pipeline(job_id: str, body: PipelineStageBody):
    stage = body.stage
    if stage not in STAGE_ORDER:
        raise HTTPException(status_code=400, detail=f"Invalid stage: {stage}")

    job = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")

    # Guard checks
    if stage == "search" and not job.data.get("case_id"):
        raise HTTPException(status_code=400, detail="Case must be initiated before moving to search")

    if stage == "finalize":
        shortlisted = supabase.table("job_talents").select("id").eq("job_id", job_id).eq("status", "shortlisted").execute()
        if not shortlisted.data:
            raise HTTPException(status_code=400, detail="At least one candidate must be shortlisted")

    if stage == "internal_interview":
        selected = supabase.table("job_talents").select("id").eq("job_id", job_id).eq("status", "selected").execute()
        if not selected.data:
            raise HTTPException(status_code=400, detail="At least one candidate must be selected")

    if stage == "client_interview":
        pending = supabase.table("interviews").select("id").eq("job_id", job_id).eq("type", "internal").eq("outcome", "pending").execute()
        if pending.data:
            raise HTTPException(status_code=400, detail="All internal interviews must have an outcome recorded")

    if stage == "onboard":
        passed = supabase.table("interviews").select("id").eq("job_id", job_id).eq("type", "client").eq("outcome", "pass").execute()
        if not passed.data:
            raise HTTPException(status_code=400, detail="At least one candidate must pass the client interview")

    update_data: dict = {"pipeline_stage": stage}
    if stage == "closed":
        accepted = supabase.table("offers").select("id").eq("job_id", job_id).eq("status", "accepted").execute()
        if not accepted.data:
            raise HTTPException(status_code=400, detail="At least one offer must be accepted before closing")
        update_data["job_status"] = "CLOSED"
        update_data["status"] = "closed"

    supabase.table("jobs").update(update_data).eq("id", job_id).execute()
    return {"job_id": job_id, "pipeline_stage": stage}


# ── Interviews ────────────────────────────────────────────────────────────────

class InterviewCreate(BaseModel):
    talent_id: str
    type: str  # internal | client
    scheduled_at: Optional[str] = None
    duration_minutes: int = 60
    interviewer_names: list[str] = []

class InterviewUpdate(BaseModel):
    outcome: Optional[str] = None
    feedback: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[str] = None
    interviewer_names: Optional[list[str]] = None


@router.get("/{job_id}/interviews")
def list_interviews(job_id: str, type: Optional[str] = None):
    query = supabase.table("interviews").select("*").eq("job_id", job_id)
    if type:
        query = query.eq("type", type)
    result = query.order("created_at").execute()
    return result.data


@router.post("/{job_id}/interviews", status_code=201)
def create_interview(job_id: str, body: InterviewCreate):
    data = {
        "job_id": job_id,
        "talent_id": body.talent_id,
        "type": body.type,
        "duration_minutes": body.duration_minutes,
        "interviewer_names": body.interviewer_names,
    }
    if body.scheduled_at:
        data["scheduled_at"] = body.scheduled_at
    result = supabase.table("interviews").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create interview")
    return result.data[0]


@router.patch("/{job_id}/interviews/{interview_id}")
def update_interview(job_id: str, interview_id: str, body: InterviewUpdate):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("interviews").update(data).eq("id", interview_id).eq("job_id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Interview not found")

    # When outcome is recorded, update job_talent status accordingly
    if body.outcome and body.outcome != "pending":
        interview = result.data[0]
        talent_id = interview["talent_id"]
        interview_type = interview["type"]
        if body.outcome == "pass":
            new_status = "internal_passed" if interview_type == "internal" else "client_passed"
        else:
            new_status = "rejected"
        supabase.table("job_talents").update({"status": new_status}).eq("job_id", job_id).eq("talent_id", talent_id).execute()

    return result.data[0]


# ── Offers ────────────────────────────────────────────────────────────────────

class OfferCreate(BaseModel):
    talent_id: str
    offered_rate: Optional[float] = None
    offered_salary: Optional[float] = None
    currency: str = "USD"
    start_date: Optional[str] = None
    notes: Optional[str] = None

class OfferUpdate(BaseModel):
    status: Optional[str] = None
    offered_rate: Optional[float] = None
    offered_salary: Optional[float] = None
    start_date: Optional[str] = None
    notes: Optional[str] = None


@router.get("/{job_id}/offers")
def list_offers(job_id: str):
    result = supabase.table("offers").select("*").eq("job_id", job_id).order("created_at").execute()
    return result.data


@router.post("/{job_id}/offers", status_code=201)
def create_offer(job_id: str, body: OfferCreate):
    data = {
        "job_id": job_id,
        "talent_id": body.talent_id,
        "currency": body.currency,
    }
    for field in ["offered_rate", "offered_salary", "start_date", "notes"]:
        val = getattr(body, field)
        if val is not None:
            data[field] = val

    result = supabase.table("offers").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create offer")

    supabase.table("job_talents").update({"status": "offer_extended"}).eq("job_id", job_id).eq("talent_id", body.talent_id).execute()
    return result.data[0]


@router.patch("/{job_id}/offers/{offer_id}")
def update_offer(job_id: str, offer_id: str, body: OfferUpdate):
    from datetime import datetime, timezone

    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if body.status == "accepted":
        data["accepted_at"] = datetime.now(timezone.utc).isoformat()

    result = supabase.table("offers").update(data).eq("id", offer_id).eq("job_id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Offer not found")

    if body.status == "accepted":
        talent_id = result.data[0]["talent_id"]
        supabase.table("talents").update({"talent_status": "PLACED"}).eq("id", talent_id).execute()
        supabase.table("job_talents").update({"status": "placed"}).eq("job_id", job_id).eq("talent_id", talent_id).execute()

    return result.data[0]
