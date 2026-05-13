from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from typing import Optional
import os
from db import supabase
from services.ai_parser import parse_resume as ai_parse

router = APIRouter(prefix="/api/talents", tags=["talents"])

ADMIN_USER_ID = os.environ.get("ADMIN_USER_ID", "b640078d-41a4-4f2c-8255-26d33a1c85bb")
STORAGE_BUCKET = "talent-docs"


class TalentCreate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
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
    experience_years: Optional[float] = None
    skills: list[str] = []
    linkedin_url: Optional[str] = None
    naukri_url: Optional[str] = None
    location: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    visa_status: Optional[str] = None
    talent_source: str = "INTERNAL"
    channel: str = "PORTAL"
    approval_status: str = "APPROVED"
    is_marketable: bool = True
    created_by_id: Optional[str] = None
    referred_by: Optional[str] = None


class TalentUpdate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    total_experience: Optional[float] = None
    experience_years: Optional[float] = None
    skills: Optional[list[str]] = None
    linkedin_url: Optional[str] = None
    location: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    visa_status: Optional[str] = None
    is_marketable: Optional[bool] = None
    talent_status: Optional[str] = None
    referred_by: Optional[str] = None


class RejectBody(BaseModel):
    note: Optional[str] = None


# ── Literal routes first (avoid conflict with /{talent_id}) ──────────────────

@router.get("/approvals/pending-count")
def pending_count():
    result = supabase.table("talents").select("id", count="exact").eq("approval_status", "PENDING").execute()
    return {"count": result.count or 0}


@router.post("/parse-resume")
async def parse_resume_route(file: UploadFile = File(...)):
    content = await file.read()
    mime = file.content_type or "application/pdf"
    try:
        return await ai_parse(content, mime)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


# ── Collection routes ─────────────────────────────────────────────────────────

@router.get("/")
def list_talents(
    search: Optional[str] = None,
    visa_status: Optional[str] = None,
    approval_status: Optional[str] = None,
    is_marketable: Optional[bool] = None,
    talent_source: Optional[str] = None,
    min_exp: Optional[float] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = supabase.table("talents").select("*", count="exact")

    if search:
        s = search.strip()
        skill_s = s.title()  # "react" → "React" for case-insensitive skill match
        or_parts = [
            f"name.ilike.%{s}%",
            f"first_name.ilike.%{s}%",
            f"last_name.ilike.%{s}%",
            f"email.ilike.%{s}%",
            f"current_title.ilike.%{s}%",
            f"summary.ilike.%{s}%",
            f"skills.cs.{{{skill_s}}}",
        ]
        query = query.or_(",".join(or_parts))
    if visa_status:
        query = query.eq("visa_status", visa_status)
    if approval_status:
        query = query.eq("approval_status", approval_status)
    if is_marketable is not None:
        query = query.eq("is_marketable", is_marketable)
    if talent_source:
        query = query.eq("talent_source", talent_source)
    if min_exp is not None:
        query = query.gte("total_experience", min_exp)

    offset = (page - 1) * page_size
    result = (
        query.order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return {"items": result.data, "total": result.count or 0, "page": page, "page_size": page_size}


@router.post("/", status_code=201)
def create_talent(body: TalentCreate):
    data = body.model_dump(exclude_none=True)
    if not data.get("name"):
        data["name"] = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip() or "Unknown"
    result = supabase.table("talents").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create talent")
    return result.data[0]


# ── Per-talent routes ─────────────────────────────────────────────────────────

@router.get("/{talent_id}")
def get_talent(talent_id: str):
    talent = supabase.table("talents").select("*").eq("id", talent_id).single().execute()
    if not talent.data:
        raise HTTPException(status_code=404, detail="Talent not found")
    skills = supabase.table("talent_skills").select("*").eq("talent_id", talent_id).execute()
    docs   = supabase.table("talent_documents").select("*").eq("talent_id", talent_id).execute()
    return {**talent.data, "talent_skills": skills.data, "talent_documents": docs.data}


@router.patch("/{talent_id}")
def update_talent(talent_id: str, body: TalentUpdate):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("talents").update(data).eq("id", talent_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Talent not found")
    return result.data[0]


@router.delete("/{talent_id}", status_code=204)
def delete_talent(talent_id: str):
    supabase.table("talents").update({"talent_status": "INACTIVE"}).eq("id", talent_id).execute()


@router.patch("/{talent_id}/approve")
def approve_talent(talent_id: str):
    from datetime import datetime, timezone
    result = supabase.table("talents").update({
        "approval_status": "APPROVED",
        "approved_by_id": ADMIN_USER_ID,
        "approved_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", talent_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Talent not found")
    return result.data[0]


@router.patch("/{talent_id}/reject")
def reject_talent(talent_id: str, body: RejectBody = RejectBody()):
    result = supabase.table("talents").update({
        "approval_status": "REJECTED",
        "approval_note": body.note,
        "approved_by_id": ADMIN_USER_ID,
    }).eq("id", talent_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Talent not found")
    return result.data[0]


@router.patch("/{talent_id}/marketing")
def toggle_marketing(talent_id: str):
    talent = supabase.table("talents").select("is_marketable").eq("id", talent_id).single().execute()
    if not talent.data:
        raise HTTPException(status_code=404, detail="Talent not found")
    result = supabase.table("talents").update({
        "is_marketable": not talent.data["is_marketable"]
    }).eq("id", talent_id).execute()
    return result.data[0]


@router.post("/{talent_id}/documents", status_code=201)
async def upload_document(
    talent_id: str,
    file: UploadFile = File(...),
    doc_type: str = "RESUME",
):
    content = await file.read()
    file_path = f"{talent_id}/{file.filename}"
    supabase.storage.from_(STORAGE_BUCKET).upload(
        file_path, content,
        {"content-type": file.content_type or "application/octet-stream", "upsert": "true"},
    )
    url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(file_path)
    doc = supabase.table("talent_documents").insert({
        "talent_id": talent_id,
        "type": doc_type,
        "file_name": file.filename,
        "file_url": url,
        "file_size": len(content),
        "mime_type": file.content_type,
    }).execute()
    return doc.data[0]


@router.get("/{talent_id}/documents/{doc_id}/url")
def get_document_url(talent_id: str, doc_id: str):
    doc = (
        supabase.table("talent_documents")
        .select("file_url,file_name")
        .eq("id", doc_id)
        .eq("talent_id", talent_id)
        .single()
        .execute()
    )
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"url": doc.data["file_url"], "file_name": doc.data["file_name"]}


@router.post("/{talent_id}/ai-summary")
async def ai_summary(talent_id: str):
    import asyncio
    import requests as req
    from services.ai_parser import generate_recruiter_summary

    docs = (
        supabase.table("talent_documents")
        .select("*")
        .eq("talent_id", talent_id)
        .eq("type", "RESUME")
        .order("uploaded_at", desc=True)
        .limit(1)
        .execute()
    )
    if not docs.data:
        raise HTTPException(status_code=404, detail="No resume document found for this talent")

    doc = docs.data[0]
    resp = await asyncio.to_thread(req.get, doc["file_url"], timeout=30)
    if resp.status_code != 200:
        raise HTTPException(status_code=422, detail="Failed to download resume file")

    mime = doc.get("mime_type") or (
        "application/pdf"
        if doc["file_name"].lower().endswith(".pdf")
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    try:
        summary = await generate_recruiter_summary(resp.content, mime)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"AI analysis failed: {e}")

    supabase.table("talents").update({"ai_summary": summary}).eq("id", talent_id).execute()
    return summary


@router.get("/{talent_id}/job-matches")
def get_job_matches(talent_id: str):
    result = (
        supabase.table("talent_job_matches")
        .select("*")
        .eq("talent_id", talent_id)
        .order("match_score", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{talent_id}/documents/{doc_id}", status_code=204)
def delete_document(talent_id: str, doc_id: str):
    doc = (
        supabase.table("talent_documents")
        .select("file_name")
        .eq("id", doc_id)
        .eq("talent_id", talent_id)
        .single()
        .execute()
    )
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        supabase.storage.from_(STORAGE_BUCKET).remove([f"{talent_id}/{doc.data['file_name']}"])
    except Exception:
        pass
    supabase.table("talent_documents").delete().eq("id", doc_id).execute()
