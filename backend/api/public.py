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
