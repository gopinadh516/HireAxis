from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from db import supabase
from services.ai_parser import parse_resume as ai_parse

router = APIRouter(prefix="/api/public", tags=["public"])

STORAGE_BUCKET = "talent-docs"


class PublicTalentCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    alt_phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "USA"
    zip_code: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    total_experience: Optional[float] = None
    skills: list[str] = []
    linkedin_url: Optional[str] = None
    location: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    visa_status: Optional[str] = None
    referred_by: Optional[str] = None


@router.post("/parse-resume")
async def parse_resume_public(file: UploadFile = File(...)):
    content = await file.read()
    mime = file.content_type or "application/pdf"
    try:
        return await ai_parse(content, mime)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/talents", status_code=201)
def create_public_talent(body: PublicTalentCreate):
    data = body.model_dump(exclude_none=True)
    data["name"] = f"{body.first_name} {body.last_name}".strip()
    data["talent_source"] = "SELF_REGISTERED"
    data["channel"] = "WEBSITE"
    data["approval_status"] = "PENDING"
    data["is_marketable"] = False
    result = supabase.table("talents").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to submit application")
    return result.data[0]


class PublicJobCreate(BaseModel):
    title: str
    description: str
    job_type: str = "FULL_TIME"
    work_mode: str = "ONSITE"
    company: Optional[str] = None
    location: Optional[str] = None
    experience_min: Optional[float] = None
    experience_max: Optional[float] = None
    openings: int = 1
    due_date: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str = "USD"
    pay_rate_min: Optional[float] = None
    pay_rate_max: Optional[float] = None
    required_skills: list[str] = []
    visa_requirements: list[str] = []
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
    # Submitter contact (stored in approval_note)
    submitter_name: Optional[str] = None
    submitter_email: Optional[str] = None
    submitter_phone: Optional[str] = None


@router.post("/jobs", status_code=201)
def create_public_job(body: PublicJobCreate):
    note_parts = [
        f"Submitted by: {body.submitter_name}" if body.submitter_name else None,
        f"Email: {body.submitter_email}" if body.submitter_email else None,
        f"Phone: {body.submitter_phone}" if body.submitter_phone else None,
    ]
    approval_note = " | ".join(p for p in note_parts if p) or None

    data = body.model_dump(exclude={"submitter_name", "submitter_email", "submitter_phone"}, exclude_none=True)
    data.update({
        "source": "manual",
        "channel": "WEBSITE",
        "approval_status": "PENDING",
        "job_status": "DRAFT",
        "status": "pending_approval",
        "is_active": False,
        "approval_note": approval_note,
    })

    result = supabase.table("jobs").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to submit job")
    return {"success": True, "message": "Job submitted for review.", "data": {"id": result.data[0]["id"]}}


@router.post("/talents/{talent_id}/documents", status_code=201)
async def upload_public_document(talent_id: str, file: UploadFile = File(...)):
    content = await file.read()
    file_path = f"{talent_id}/{file.filename}"
    supabase.storage.from_(STORAGE_BUCKET).upload(
        file_path, content,
        {"content-type": file.content_type or "application/octet-stream", "upsert": "true"},
    )
    url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(file_path)
    doc = supabase.table("talent_documents").insert({
        "talent_id": talent_id,
        "type": "RESUME",
        "file_name": file.filename,
        "file_url": url,
        "file_size": len(content),
        "mime_type": file.content_type,
    }).execute()
    return doc.data[0]
