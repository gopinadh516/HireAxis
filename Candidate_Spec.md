# Candidates Feature — Implementation Spec
## New Recruitment Portal (Next.js 16 + FastAPI)

This document specifies the complete Candidates feature to implement in the new portal.
It is written for Claude Code and covers database, backend (FastAPI), and frontend (Next.js).

---

## 1. Overview of What to Build

| Feature | Description |
|---|---|
| Candidates list | Paginated table with search, skill, status, visa, source, marketable filters |
| Create candidate | 4-step wizard: Personal → Address → Professional → Skills |
| Edit candidate | Same wizard, pre-filled |
| Candidate detail | Full profile view with documents, skills, approval status |
| Resume upload | File upload stored in Supabase Storage bucket `candidate-docs` |
| AI resume parsing | Upload PDF/DOCX → NVIDIA Llama extracts structured data → pre-fills wizard |
| Approval workflow | PENDING → APPROVED / REJECTED with optional note |
| Marketing toggle | `is_marketable` flag; only marketable + approved candidates show by default |
| Public apply form | `/apply` — no-auth 4-step wizard, same fields, resume upload, AI parsing |
| Approvals page | Admin reviews PENDING candidates; view resume, toggle marketing, approve/reject |
| Sidebar badge | Live count of pending approvals shown on Approvals nav item |

---

## 2. Database Schema (Supabase SQL)

Run these migrations in Supabase SQL editor.

```sql
-- Enums
create type user_role        as enum ('ADMIN','HR','FINANCE','RECRUITER');
create type user_status      as enum ('ACTIVE','INACTIVE');
create type gender_type      as enum ('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY');
create type candidate_status as enum ('ACTIVE','INACTIVE','PLACED','BLACKLISTED');
create type candidate_source as enum ('INTERNAL','SELF_REGISTERED','REFERRAL','AGENCY','JOB_BOARD');
create type skill_level      as enum ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT');
create type document_type    as enum ('RESUME','COVER_LETTER','CERTIFICATE','OTHER');
create type submission_channel as enum ('PORTAL','WEBSITE','AGENT');
create type approval_status  as enum ('PENDING','APPROVED','REJECTED');
create type visa_status      as enum (
  'USC','GC','GC_EAD','H1B','H4_EAD','L1','L2_EAD',
  'F1_OPT','F1_CPT','STEM_OPT','TN','E3','O1','J1','EAD','OTHER'
);

-- Profiles (mirrors Supabase auth.users)
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  first_name  text not null,
  last_name   text not null,
  role        user_role   not null default 'RECRUITER',
  status      user_status not null default 'ACTIVE',
  phone       text,
  avatar_url  text,
  created_by_id uuid references profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Candidates
create table candidates (
  id               uuid primary key default gen_random_uuid(),
  -- Personal
  first_name       text not null,
  last_name        text not null,
  email            text unique not null,
  phone            text not null,
  alt_phone        text,
  dob              date,
  gender           gender_type,
  -- Address
  address          text,
  city             text,
  state            text,
  country          text default 'USA',
  zip_code         text,
  -- Professional
  current_title    text,
  current_company  text,
  total_experience float,
  linkedin_url     text not null,   -- REQUIRED
  portfolio_url    text,
  summary          text,
  -- Visa
  visa_status      visa_status,
  -- Meta
  status           candidate_status   not null default 'ACTIVE',
  source           candidate_source   not null default 'INTERNAL',
  is_marketable    boolean            not null default true,
  channel          submission_channel not null default 'PORTAL',
  approval_status  approval_status    not null default 'APPROVED',
  approval_note    text,
  -- Relations
  created_by_id    uuid references profiles(id),
  approved_by_id   uuid references profiles(id),
  approved_at      timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Candidate skills
create table candidate_skills (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  skill        text not null,
  level        skill_level,
  years_of_exp float,
  created_at   timestamptz default now()
);

-- Candidate documents
create table candidate_documents (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  type         document_type not null default 'RESUME',
  file_name    text not null,
  file_url     text not null,
  file_size    int,
  mime_type    text,
  uploaded_at  timestamptz default now()
);

-- Indexes
create index on candidates(email);
create index on candidates(status);
create index on candidates(approval_status);
create index on candidates(is_marketable);
create index on candidates(visa_status);
create index on candidates(created_at desc);
create index on candidate_skills(candidate_id);
create index on candidate_skills(skill);
create index on candidate_documents(candidate_id);

-- Enable Realtime on candidates (optional, for live updates)
alter publication supabase_realtime add table candidates;
```

**Supabase Storage bucket:**
Create a bucket called `candidate-docs`. Set it to **Public** so `get_public_url()` links work directly.

---

## 3. FastAPI Backend

### 3.1 Project structure

```
backend/
  main.py
  config.py           # env vars
  auth.py             # Supabase JWT verification dependency
  routers/
    candidates.py     # all candidate endpoints
    public.py         # no-auth endpoints (/apply form, parse-resume)
  services/
    candidates.py     # DB queries, business logic
    storage.py        # Supabase storage upload helpers
    ai_parser.py      # NVIDIA Llama resume parsing
  models/
    candidates.py     # Pydantic request/response schemas
```

### 3.2 Auth dependency

```python
# auth.py
from fastapi import Depends, HTTPException, Header
from supabase import create_client
from config import settings

supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    token = authorization[7:]
    res = supabase_admin.auth.get_user(token)
    if not res.user:
        raise HTTPException(401, "Invalid or expired token")
    # Look up profile
    profile = supabase_admin.table("profiles").select("*").eq("id", res.user.id).single().execute()
    if not profile.data:
        raise HTTPException(401, "Profile not found")
    if profile.data["status"] == "INACTIVE":
        raise HTTPException(403, "Account deactivated")
    return profile.data

def require_roles(*roles):
    async def check(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return check
```

### 3.3 Pydantic models

```python
# models/candidates.py
from pydantic import BaseModel, HttpUrl, EmailStr
from typing import Optional, List
from enum import Enum
from datetime import date, datetime
from uuid import UUID

class VisaStatus(str, Enum):
    USC="USC"; GC="GC"; GC_EAD="GC_EAD"; H1B="H1B"; H4_EAD="H4_EAD"
    L1="L1"; L2_EAD="L2_EAD"; F1_OPT="F1_OPT"; F1_CPT="F1_CPT"
    STEM_OPT="STEM_OPT"; TN="TN"; E3="E3"; O1="O1"; J1="J1"; EAD="EAD"; OTHER="OTHER"

class SkillLevel(str, Enum):
    BEGINNER="BEGINNER"; INTERMEDIATE="INTERMEDIATE"; ADVANCED="ADVANCED"; EXPERT="EXPERT"

class SkillIn(BaseModel):
    skill: str
    level: Optional[SkillLevel] = None
    years_of_exp: Optional[float] = None

class CreateCandidateIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    alt_phone: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "USA"
    zip_code: Optional[str] = None
    visa_status: VisaStatus
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    total_experience: Optional[float] = None
    linkedin_url: str          # REQUIRED — validate starts with http
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    skills: Optional[List[SkillIn]] = []

class UpdateCandidateIn(BaseModel):
    # All optional for PATCH
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    # ... same fields as CreateCandidateIn but all Optional
    linkedin_url: Optional[str] = None
    skills: Optional[List[SkillIn]] = None

class ApproveRejectIn(BaseModel):
    note: Optional[str] = None
    is_marketable: Optional[bool] = None   # only used on approve

class ListCandidatesParams(BaseModel):
    page: int = 1
    limit: int = 20
    search: Optional[str] = None
    skill: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    visa_status: Optional[str] = None
    is_marketable: Optional[bool] = None
    approval_status: Optional[str] = "APPROVED"   # default hides pending
    sort_by: str = "created_at"
    sort_order: str = "desc"
```

### 3.4 Candidates router

```python
# routers/candidates.py
from fastapi import APIRouter, Depends, UploadFile, File, Query
from auth import get_current_user, require_roles
import services.candidates as svc

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

@router.get("/")
async def list_candidates(
    page: int = Query(1), limit: int = Query(20),
    search: str = Query(None), skill: str = Query(None),
    approval_status: str = Query("APPROVED"),
    is_marketable: bool = Query(None),
    user=Depends(require_roles("ADMIN","HR","RECRUITER","FINANCE"))
):
    return await svc.list_candidates(page, limit, search, skill, approval_status, is_marketable)

@router.post("/", status_code=201)
async def create_candidate(body: CreateCandidateIn, user=Depends(require_roles("ADMIN","HR","RECRUITER"))):
    return await svc.create_candidate(body, created_by_id=user["id"], channel="PORTAL")

@router.get("/{candidate_id}")
async def get_candidate(candidate_id: str, user=Depends(require_roles("ADMIN","HR","RECRUITER","FINANCE"))):
    return await svc.get_candidate(candidate_id)

@router.patch("/{candidate_id}")
async def update_candidate(candidate_id: str, body: UpdateCandidateIn, user=Depends(require_roles("ADMIN","HR","RECRUITER"))):
    return await svc.update_candidate(candidate_id, body)

@router.patch("/{candidate_id}/approve")
async def approve_candidate(candidate_id: str, body: ApproveRejectIn, user=Depends(require_roles("ADMIN"))):
    return await svc.approve_candidate(candidate_id, user["id"], body.note, body.is_marketable)

@router.patch("/{candidate_id}/reject")
async def reject_candidate(candidate_id: str, body: ApproveRejectIn, user=Depends(require_roles("ADMIN"))):
    return await svc.reject_candidate(candidate_id, user["id"], body.note)

@router.patch("/{candidate_id}/marketing")
async def toggle_marketing(candidate_id: str, user=Depends(require_roles("ADMIN","HR","RECRUITER"))):
    return await svc.toggle_marketing(candidate_id)

@router.delete("/{candidate_id}")
async def delete_candidate(candidate_id: str, user=Depends(require_roles("ADMIN","HR"))):
    return await svc.delete_candidate(candidate_id)

# Documents
@router.post("/{candidate_id}/documents", status_code=201)
async def upload_document(
    candidate_id: str, file: UploadFile = File(...),
    type: str = "RESUME", user=Depends(require_roles("ADMIN","HR","RECRUITER"))
):
    return await svc.upload_document(candidate_id, file, type)

@router.get("/{candidate_id}/documents/{doc_id}/url")
async def get_document_url(candidate_id: str, doc_id: str, user=Depends(get_current_user)):
    return await svc.get_document_signed_url(candidate_id, doc_id)

@router.delete("/{candidate_id}/documents/{doc_id}")
async def delete_document(candidate_id: str, doc_id: str, user=Depends(require_roles("ADMIN","HR","RECRUITER"))):
    return await svc.delete_document(candidate_id, doc_id)

# AI resume parsing
@router.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...), user=Depends(require_roles("ADMIN","HR","RECRUITER"))):
    return await svc.parse_resume(file)
```

### 3.5 Public router (no auth)

```python
# routers/public.py
from fastapi import APIRouter, UploadFile, File
from slowapi import Limiter   # pip install slowapi

router = APIRouter(prefix="/api/public", tags=["public"])

@router.post("/candidates", status_code=201)
async def public_submit_candidate(body: CreateCandidateIn):
    # approval_status defaults to PENDING for website submissions
    candidate = await svc.create_candidate(body, created_by_id=None, channel="WEBSITE")
    return {"success": True, "message": "Application submitted successfully.", "data": {"id": candidate["id"]}}

@router.post("/parse-resume")
async def public_parse_resume(file: UploadFile = File(...)):
    return await svc.parse_resume(file)

@router.post("/candidates/{candidate_id}/documents", status_code=201)
async def public_upload_document(candidate_id: str, file: UploadFile = File(...), type: str = "RESUME"):
    return await svc.upload_document(candidate_id, file, type)
```

### 3.6 Candidates service (key functions)

```python
# services/candidates.py
from supabase import create_client
from config import settings
import io, re

sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

SELECT_FIELDS = """
  id, first_name, last_name, email, phone, alt_phone, dob, gender,
  address, city, state, country, zip_code,
  current_title, current_company, total_experience,
  linkedin_url, portfolio_url, summary, visa_status,
  status, source, is_marketable, channel, approval_status, approval_note,
  created_at, updated_at, approved_at,
  candidate_skills(id, skill, level, years_of_exp),
  candidate_documents(id, type, file_name, file_url, file_size, mime_type, uploaded_at),
  profiles!created_by_id(id, first_name, last_name, email)
"""

async def list_candidates(page, limit, search, skill, approval_status, is_marketable):
    q = sb.table("candidates").select(SELECT_FIELDS, count="exact")
    if approval_status:
        q = q.eq("approval_status", approval_status)
    if is_marketable is not None:
        q = q.eq("is_marketable", is_marketable)
    if search:
        q = q.or_(f"first_name.ilike.%{search}%,last_name.ilike.%{search}%,email.ilike.%{search}%")
    if skill:
        # filter via join
        q = q.contains("candidate_skills.skill", [skill])
    offset = (page - 1) * limit
    q = q.order("created_at", desc=True).range(offset, offset + limit - 1)
    res = q.execute()
    total = res.count or 0
    return {
        "data": res.data,
        "meta": {"total": total, "page": page, "limit": limit, "total_pages": -(-total // limit)}
    }

async def create_candidate(body, created_by_id, channel):
    # Check duplicate
    existing = sb.table("candidates").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(409, "A candidate with this email already exists")
    
    approval = "APPROVED" if channel == "PORTAL" else "PENDING"
    data = body.model_dump(exclude={"skills"})
    data.update({"channel": channel, "approval_status": approval, "created_by_id": created_by_id,
                 "source": "INTERNAL" if created_by_id else "SELF_REGISTERED"})
    
    res = sb.table("candidates").insert(data).execute()
    candidate = res.data[0]
    
    if body.skills:
        skills_data = [{"candidate_id": candidate["id"], **s.model_dump()} for s in body.skills]
        sb.table("candidate_skills").insert(skills_data).execute()
    
    return await get_candidate(candidate["id"])

async def approve_candidate(id, approved_by_id, note, is_marketable):
    update = {"approval_status": "APPROVED", "approved_by_id": approved_by_id,
              "approved_at": "now()", "approval_note": note}
    if is_marketable is not None:
        update["is_marketable"] = is_marketable
    sb.table("candidates").update(update).eq("id", id).execute()
    return await get_candidate(id)

async def upload_document(candidate_id, file, doc_type):
    content = await file.read()
    path = f"candidates/{candidate_id}/{int(time.time())}-{file.filename}"
    sb.storage.from_("candidate-docs").upload(path, content, {"content-type": file.content_type})
    url = sb.storage.from_("candidate-docs").get_public_url(path)
    doc = sb.table("candidate_documents").insert({
        "candidate_id": candidate_id, "type": doc_type,
        "file_name": file.filename, "file_url": url,
        "file_size": len(content), "mime_type": file.content_type
    }).execute()
    return doc.data[0]

async def get_document_signed_url(candidate_id, doc_id):
    doc = sb.table("candidate_documents").select("file_url").eq("id", doc_id).eq("candidate_id", candidate_id).single().execute()
    if not doc.data:
        raise HTTPException(404, "Document not found")
    # Extract storage path from public URL
    url = doc.data["file_url"]
    path = re.sub(r"^.*/candidate-docs/", "", url)
    signed = sb.storage.from_("candidate-docs").create_signed_url(path, 3600)
    return {"signed_url": signed["signedURL"]}
```

### 3.7 AI Resume Parsing (NVIDIA Llama)

```python
# services/ai_parser.py
from openai import AsyncOpenAI
from config import settings
import fitz  # PyMuPDF — pip install pymupdf
try:
    import mammoth  # pip install mammoth
except ImportError:
    mammoth = None

client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=settings.NVIDIA_API_KEY,
)

async def parse_resume(file) -> dict:
    content = await file.read()
    
    # Extract text
    if file.content_type == "application/pdf":
        doc = fitz.open(stream=content, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
    elif mammoth and "word" in (file.content_type or ""):
        result = mammoth.extract_raw_text({"buffer": content})
        text = result.value
    else:
        text = content.decode("utf-8", errors="ignore")
    
    if not text.strip():
        raise HTTPException(422, "Could not extract text from file")
    
    prompt = f"""Extract candidate profile from this resume. Return ONLY valid JSON with these fields:
{{
  "first_name": "", "last_name": "", "email": "", "phone": "",
  "current_title": "", "current_company": "",
  "total_experience": 0,
  "linkedin_url": "",
  "city": "", "state": "", "country": "",
  "visa_status": "one of: USC,GC,GC_EAD,H1B,H4_EAD,L1,L2_EAD,F1_OPT,F1_CPT,STEM_OPT,TN,E3,O1,J1,EAD,OTHER or null",
  "summary": "",
  "skills": [{{"skill": "", "level": "BEGINNER|INTERMEDIATE|ADVANCED|EXPERT or null", "years_of_exp": 0}}]
}}
Only include fields you can confidently extract. Leave others as empty string or null.

RESUME:
{text[:8000]}"""

    response = await client.chat.completions.create(
        model="meta/llama-3.3-70b-instruct",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=2000,
    )
    
    import json, re
    raw = response.choices[0].message.content
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise HTTPException(422, "Could not extract data from this file")
    return json.loads(match.group())
```

---

## 4. Frontend (Next.js 16 App Router)

### 4.1 File structure

```
app/
  (portal)/                   # authenticated layout
    layout.tsx                # AppLayout with sidebar
    candidates/
      page.tsx                # CandidatesListPage
      new/
        page.tsx              # CreateCandidatePage
      [id]/
        page.tsx              # CandidateDetailPage
        edit/
          page.tsx            # EditCandidatePage
    approvals/
      page.tsx                # ApprovalsPage
  (public)/                   # no-auth layout
    apply/
      page.tsx                # PublicCandidateFormPage
  layout.tsx                  # root layout + providers

components/
  candidates/
    CandidateForm.tsx         # 4-step wizard (shared by create + edit)
    CandidateRow.tsx          # row card used in list + approvals
  ui/                         # shadcn/ui re-exports + custom

lib/
  api.ts                      # fetch wrapper with Supabase token
  supabase.ts                 # Supabase browser client
```

### 4.2 API client

```typescript
// lib/api.ts
import { createBrowserClient } from "@supabase/ssr";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}
```

### 4.3 Candidates list page

```tsx
// app/(portal)/candidates/page.tsx
"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

const VISA_LABELS = {
  USC: "US Citizen", GC: "Green Card", H1B: "H1B", /* ... */
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    apiFetch(`/api/candidates?${params}`)
      .then((r: any) => { setCandidates(r.data); setMeta(r.meta); })
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Candidates</h1>
          <p className="text-muted-foreground text-sm">{meta.total} total</p>
        </div>
        <Button asChild><Link href="/candidates/new"><Plus className="h-4 w-4 mr-2" />Add Candidate</Link></Button>
      </div>
      
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email, title..." 
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Add Select filters for visa_status, status, source */}
      </div>
      
      <div className="space-y-2">
        {candidates.map((c: any) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}
```

### 4.4 4-Step Candidate Form Wizard

The wizard has **4 steps**. Use shadcn/ui `Card`, `Input`, `Select`, `Textarea`, `Button`.

```
Step 1 — Personal
  first_name*, last_name*, email*, phone*, alt_phone,
  dob, gender (Select), visa_status* (Select)

Step 2 — Address
  address, city, state, country, zip_code

Step 3 — Professional
  current_title, current_company, total_experience (number),
  linkedin_url* (REQUIRED — validate https://),
  portfolio_url, summary (Textarea)
  
  ── AI Resume Upload panel (top of step 3) ──
  Drag-and-drop or click to upload PDF/DOCX
  → POST /api/candidates/parse-resume (with auth)
     OR POST /api/public/parse-resume  (public form)
  → On success, pre-fill all wizard fields from response
  → Show spinner while parsing, then "✓ Parsed successfully"

Step 4 — Skills
  Dynamic list: skill (text)*, level (Select: BEGINNER/INTERMEDIATE/ADVANCED/EXPERT), years_of_exp (number)
  "+ Add skill" button, remove individual rows
```

**Validation rules (checked on Next click):**
- Step 1: first_name, last_name, email (valid format), phone (≥7 chars), visa_status required
- Step 3: linkedin_url required, must start with `https?://`
- Step 4: each added skill row must have skill text

**Submit payload example:**
```json
{
  "first_name": "Jane", "last_name": "Doe", "email": "jane@example.com",
  "phone": "555-0100", "visa_status": "H1B",
  "city": "Austin", "state": "TX", "country": "USA",
  "linkedin_url": "https://linkedin.com/in/janedoe",
  "current_title": "Software Engineer", "total_experience": 5,
  "skills": [{"skill": "Python", "level": "ADVANCED", "years_of_exp": 4}]
}
```

**After submit (internal form):** navigate to `/candidates/{id}`
**After submit (public form):** upload resume file to `/api/public/candidates/{id}/documents`, then show success screen.

### 4.5 Approvals page

```
/approvals  (ADMIN only)

Two tabs: Candidates | Jobs
Each pending candidate card shows:
  - Avatar initials, name (link to /candidates/[id]), email, phone
  - current_title, visa_status badge, experience, submitted date
  - Skills chips (first 6)
  - Bottom bar:
    - "View Resume" button → GET /api/candidates/{id}/documents/{docId}/url → open signedURL
    - Marketing toggle (local state, default false)
    - Approve button (green) → PATCH /api/candidates/{id}/approve { is_marketable: <toggle> }
    - Reject button (red) → opens modal asking for rejection note → PATCH /api/candidates/{id}/reject

Sidebar badge: GET /api/approvals/pending-count → show total on Approvals nav item
```

**Pending count endpoint (add to FastAPI):**
```python
@router.get("/api/approvals/pending-count")
async def pending_count(user=Depends(require_roles("ADMIN"))):
    candidates = sb.table("candidates").select("id", count="exact").eq("approval_status", "PENDING").execute()
    jobs = sb.table("jobs").select("id", count="exact").eq("approval_status", "PENDING").execute()
    c = candidates.count or 0
    j = jobs.count or 0
    return {"data": {"candidates": c, "jobs": j, "total": c + j}}
```

### 4.6 Public apply form `/apply`

- Same 4-step wizard as internal form but NO authentication
- Uses `/api/public/parse-resume` and `/api/public/candidates`
- `channel` defaults to `WEBSITE`, `approval_status` defaults to `PENDING`
- After submit: upload resume to `/api/public/candidates/{id}/documents`
- Show branded success screen: "Application submitted! Our team will review it."
- No sidebar, no nav — use a minimal `PublicLayout` with logo only

### 4.7 Visa status labels (copy to `lib/constants.ts`)

```typescript
export const VISA_STATUS_LABELS: Record<string, string> = {
  USC: "US Citizen", GC: "Green Card", GC_EAD: "GC EAD",
  H1B: "H1B", H4_EAD: "H4 EAD", L1: "L1", L2_EAD: "L2 EAD",
  F1_OPT: "F1 OPT", F1_CPT: "F1 CPT", STEM_OPT: "STEM OPT",
  TN: "TN", E3: "E3", O1: "O1", J1: "J1", EAD: "EAD", OTHER: "Other",
};

export const VISA_STATUS_OPTIONS = Object.entries(VISA_STATUS_LABELS)
  .map(([value, label]) => ({ value, label }));
```

---

## 5. Auth Flow

Same pattern as existing portal:

1. Login via Supabase `signInWithPassword`
2. On `SIGNED_IN` event: call `/api/auth/me` (or `/api/users/me`) → get profile → store in state
3. Every API call sends `Authorization: Bearer <access_token>` from Supabase session
4. Backend verifies token with `supabase_admin.auth.get_user(token)`
5. For public routes (`/api/public/*`) — no auth header, no token check

**Recommended state management:** Zustand store with `user`, `isAuthenticated`, `isLoading` — same shape as current portal.

---

## 6. Key Differences from Current Portal

| Concern | Current (ByteSoftware) | New Portal |
|---|---|---|
| Backend language | TypeScript / Node.js + Express | Python / FastAPI |
| ORM | Prisma | Supabase Python client (direct table queries) |
| UI components | Custom Tailwind | shadcn/ui |
| Router | React Router v6 | Next.js App Router |
| AI parsing | Anthropic claude-haiku | NVIDIA Llama-3.3-70b via OpenAI SDK |
| Column naming | camelCase (Prisma) | snake_case (Supabase direct) |
| File upload | multer (Node) | `UploadFile` (FastAPI built-in) |
| Rate limiting | express-rate-limit | slowapi (FastAPI) |

**snake_case everywhere in FastAPI/Supabase** — all DB columns and API request/response bodies use `snake_case`. The frontend can keep `camelCase` internally; just convert at the API boundary or accept `snake_case` from responses.

---

## 7. Environment Variables

**.env (backend):**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NVIDIA_API_KEY=nvapi-...
FRONTEND_URL=http://localhost:3000
```

**.env.local (frontend):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 8. Implementation Order (suggested for Claude Code)

1. **DB migration** — run the SQL above in Supabase dashboard
2. **FastAPI skeleton** — `main.py`, `config.py`, `auth.py`, health endpoint
3. **Candidates service** — `list`, `get`, `create`, `update`, `delete`
4. **Approve/reject + marketing** endpoints
5. **Storage + documents** — upload, signed URL, delete
6. **AI parser** — `ai_parser.py` with NVIDIA Llama
7. **Public router** — `/api/public/candidates`, `/api/public/parse-resume`
8. **Next.js auth** — Supabase client, auth store, middleware, login page
9. **Candidates list page** — with search + filters
10. **CandidateForm wizard** — 4 steps with validation + AI upload panel
11. **Create / Edit / Detail pages**
12. **Public `/apply` page**
13. **Approvals page** — pending list, resume viewer, marketing toggle, approve/reject
14. **Sidebar badge** — pending count query

---

*Generated from ByteSoftware recruitment portal implementation. All business logic, validation rules, and UX patterns are preserved — only the tech stack mapping changes.*
