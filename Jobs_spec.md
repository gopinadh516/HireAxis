# Jobs Feature — Implementation Spec
## New Recruitment Portal (Next.js 16 + FastAPI)

This document specifies the complete Jobs feature to implement in the new portal.
It is written for Claude Code and covers database, backend (FastAPI), and frontend (Next.js).

---

## 1. Overview of What to Build

| Feature | Description |
|---|---|
| Jobs list | Paginated table + card grid view with search, status, type, work-mode filters |
| Create job | Single-page multi-section form: Basic Info → Client/Vendor → Compensation → Skills → Visa |
| Edit job | Same form, pre-filled |
| Job detail | Full job view with conditional sections driven by job type |
| isActive toggle | Hide a job posting without closing it; works on list and detail page |
| Approval workflow | PENDING → APPROVED / REJECTED with optional note (no marketing flag for jobs) |
| Public post-job form | `/post-job` — no-auth single-page form, stores submitter contact in approval_note |
| Approvals page | Admin reviews PENDING jobs; view details, approve/reject with note |
| Sidebar badge | Live count includes pending jobs (shared endpoint with candidates) |

---

## 2. Database Schema (Supabase SQL)

Run these migrations in Supabase SQL editor.
(If you already ran the candidates migration, skip the shared enums that already exist.)

```sql
-- Shared enums (skip if already created)
create type user_role        as enum ('ADMIN','HR','FINANCE','RECRUITER');
create type user_status      as enum ('ACTIVE','INACTIVE');
create type submission_channel as enum ('PORTAL','WEBSITE','AGENT');
create type approval_status  as enum ('PENDING','APPROVED','REJECTED');
create type visa_status      as enum (
  'USC','GC','GC_EAD','H1B','H4_EAD','L1','L2_EAD',
  'F1_OPT','F1_CPT','STEM_OPT','TN','E3','O1','J1','EAD','OTHER'
);

-- Jobs-specific enums
create type job_status as enum ('DRAFT','OPEN','CLOSED','ON_HOLD');
create type job_type   as enum ('FULL_TIME','PART_TIME','CONTRACT','CONTRACT_TO_HIRE','TEMPORARY','INTERNSHIP','W2');
create type work_mode  as enum ('ONSITE','REMOTE','HYBRID');

-- Jobs table
create table jobs (
  id                   uuid primary key default gen_random_uuid(),

  -- Core
  title                text not null,
  description          text not null,
  company              text not null,           -- end-client name for contract types
  location             text,

  -- Type / mode
  work_mode            work_mode   not null default 'ONSITE',
  type                 job_type    not null default 'FULL_TIME',
  status               job_status  not null default 'OPEN',
  is_active            boolean     not null default true,

  -- Compensation (full-time: salary; contract: pay/bill rates)
  salary_min           numeric,
  salary_max           numeric,
  currency             text not null default 'USD',
  pay_rate_min         numeric,
  pay_rate_max         numeric,
  bill_rate_min        numeric,
  bill_rate_max        numeric,

  -- Skills (stored as arrays — no separate table)
  required_skills      text[]   not null default '{}',
  nice_to_have         text[]   not null default '{}',

  -- Requirements
  experience_min       numeric,
  experience_max       numeric,
  visa_requirements    text[]   not null default '{}',  -- subset of visa_status enum values
  openings             integer  not null default 1,
  application_deadline date,
  due_date             date,

  -- Full-time / direct-hire: client company contact
  client_name          text,
  client_contact       text,
  client_email         text,
  client_phone         text,

  -- Contract / W2: end-client contact
  end_client_name      text,
  end_client_contact   text,
  end_client_email     text,
  end_client_phone     text,

  -- Contract / W2: vendor / MSP contact
  vendor_name          text,
  vendor_contact       text,
  vendor_email         text,
  vendor_phone         text,

  -- Meta / approval
  channel              submission_channel not null default 'PORTAL',
  approval_status      approval_status    not null default 'APPROVED',
  approval_note        text,                -- also stores public-form submitter contact
  approved_by_id       uuid references profiles(id),
  approved_at          timestamptz,

  -- Relations
  posted_by_id         uuid references profiles(id),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- Indexes
create index on jobs(status);
create index on jobs(type);
create index on jobs(work_mode);
create index on jobs(is_active);
create index on jobs(approval_status);
create index on jobs(created_at desc);
create index on jobs(due_date);
```

**No separate skills table** — `required_skills` and `nice_to_have` are `text[]` columns on the jobs row.
**No documents** — jobs have no file uploads.

---

## 3. FastAPI Backend

### 3.1 Project structure additions

```
backend/
  routers/
    jobs.py          # all authenticated job endpoints
    public.py        # add /post-job route here (alongside /candidates)
  services/
    jobs.py          # DB queries, business logic
  models/
    jobs.py          # Pydantic request/response schemas
```

### 3.2 Auth dependency (same as candidates)

Reuse `auth.py` from the Candidates spec. `require_roles(*roles)` is shared.

### 3.3 Pydantic models

```python
# models/jobs.py
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum
from datetime import date, datetime
from uuid import UUID

class JobStatus(str, Enum):
    DRAFT="DRAFT"; OPEN="OPEN"; CLOSED="CLOSED"; ON_HOLD="ON_HOLD"

class JobType(str, Enum):
    FULL_TIME="FULL_TIME"; PART_TIME="PART_TIME"
    CONTRACT="CONTRACT"; CONTRACT_TO_HIRE="CONTRACT_TO_HIRE"
    TEMPORARY="TEMPORARY"; INTERNSHIP="INTERNSHIP"; W2="W2"

class WorkMode(str, Enum):
    ONSITE="ONSITE"; REMOTE="REMOTE"; HYBRID="HYBRID"

# CONTRACT_TYPES drives conditional sections
CONTRACT_TYPES = {"CONTRACT", "CONTRACT_TO_HIRE", "TEMPORARY", "W2"}
FULLTIME_TYPES = {"FULL_TIME", "PART_TIME", "INTERNSHIP"}

class CreateJobIn(BaseModel):
    title:                str
    description:          str
    company:              str
    location:             Optional[str] = None
    work_mode:            WorkMode = WorkMode.ONSITE
    type:                 JobType  = JobType.FULL_TIME
    status:               JobStatus = JobStatus.OPEN

    salary_min:           Optional[float] = None
    salary_max:           Optional[float] = None
    currency:             str = "USD"
    pay_rate_min:         Optional[float] = None
    pay_rate_max:         Optional[float] = None
    bill_rate_min:        Optional[float] = None
    bill_rate_max:        Optional[float] = None

    required_skills:      List[str] = []
    nice_to_have:         List[str] = []
    experience_min:       Optional[float] = None
    experience_max:       Optional[float] = None
    visa_requirements:    List[str] = []
    openings:             int = 1
    application_deadline: Optional[date] = None
    due_date:             Optional[date] = None

    client_name:          Optional[str] = None
    client_contact:       Optional[str] = None
    client_email:         Optional[str] = None
    client_phone:         Optional[str] = None

    end_client_name:      Optional[str] = None
    end_client_contact:   Optional[str] = None
    end_client_email:     Optional[str] = None
    end_client_phone:     Optional[str] = None

    vendor_name:          Optional[str] = None
    vendor_contact:       Optional[str] = None
    vendor_email:         Optional[str] = None
    vendor_phone:         Optional[str] = None

class UpdateJobIn(CreateJobIn):
    # All fields optional for PATCH
    title:       Optional[str] = None
    description: Optional[str] = None
    company:     Optional[str] = None
    is_active:   Optional[bool] = None

class ApproveRejectIn(BaseModel):
    note: Optional[str] = None
    # No is_marketable for jobs (unlike candidates)

class ListJobsParams(BaseModel):
    page:            int = 1
    limit:           int = 20
    search:          Optional[str] = None
    status:          Optional[str] = None
    type:            Optional[str] = None
    work_mode:       Optional[str] = None
    is_active:       Optional[bool] = None
    approval_status: Optional[str] = "APPROVED"   # default hides pending
    channel:         Optional[str] = None
    sort_by:         str = "created_at"
    sort_order:      str = "desc"
```

### 3.4 Jobs router

```python
# routers/jobs.py
from fastapi import APIRouter, Depends, Query
from auth import get_current_user, require_roles
import services.jobs as svc

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.get("/")
async def list_jobs(
    page: int = Query(1), limit: int = Query(20),
    search: str = Query(None), status: str = Query(None),
    type: str = Query(None), work_mode: str = Query(None),
    is_active: bool = Query(None), approval_status: str = Query("APPROVED"),
    sort_by: str = Query("created_at"), sort_order: str = Query("desc"),
    user=Depends(require_roles("ADMIN","HR","RECRUITER","FINANCE"))
):
    return await svc.list_jobs(
        page, limit, search, status, type, work_mode,
        is_active, approval_status, sort_by, sort_order
    )

@router.post("/", status_code=201)
async def create_job(body: CreateJobIn, user=Depends(require_roles("ADMIN","HR","RECRUITER"))):
    return await svc.create_job(body, posted_by_id=user["id"], channel="PORTAL")

@router.get("/{job_id}")
async def get_job(job_id: str, user=Depends(require_roles("ADMIN","HR","RECRUITER","FINANCE"))):
    return await svc.get_job(job_id)

@router.patch("/{job_id}")
async def update_job(job_id: str, body: UpdateJobIn, user=Depends(require_roles("ADMIN","HR","RECRUITER"))):
    return await svc.update_job(job_id, body)

@router.patch("/{job_id}/toggle")
async def toggle_active(job_id: str, user=Depends(require_roles("ADMIN","HR","RECRUITER"))):
    return await svc.toggle_job_active(job_id)

@router.patch("/{job_id}/approve")
async def approve_job(job_id: str, body: ApproveRejectIn, user=Depends(require_roles("ADMIN"))):
    return await svc.approve_job(job_id, user["id"], body.note)

@router.patch("/{job_id}/reject")
async def reject_job(job_id: str, body: ApproveRejectIn, user=Depends(require_roles("ADMIN"))):
    return await svc.reject_job(job_id, user["id"], body.note)

@router.delete("/{job_id}")
async def delete_job(job_id: str, user=Depends(require_roles("ADMIN","HR"))):
    return await svc.delete_job(job_id)
```

### 3.5 Public router addition

```python
# Add to routers/public.py alongside /candidates
@router.post("/jobs", status_code=201)
async def public_submit_job(body: CreateJobIn):
    job = await jobs_svc.create_job(body, posted_by_id=None, channel="WEBSITE")
    return {"success": True, "message": "Job submitted for review.", "data": {"id": job["id"]}}
```

### 3.6 Jobs service

```python
# services/jobs.py
from supabase import create_client
from fastapi import HTTPException
from config import settings

sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

SELECT_FIELDS = """
  id, title, description, company, location, work_mode, type, status, is_active,
  salary_min, salary_max, currency, pay_rate_min, pay_rate_max, bill_rate_min, bill_rate_max,
  required_skills, nice_to_have, experience_min, experience_max, visa_requirements,
  openings, application_deadline, due_date,
  client_name, client_contact, client_email, client_phone,
  end_client_name, end_client_contact, end_client_email, end_client_phone,
  vendor_name, vendor_contact, vendor_email, vendor_phone,
  channel, approval_status, approval_note, approved_at,
  created_at, updated_at,
  profiles!posted_by_id(id, first_name, last_name, email),
  profiles!approved_by_id(id, first_name, last_name)
"""

async def list_jobs(page, limit, search, status, type_, work_mode,
                    is_active, approval_status, sort_by, sort_order):
    q = sb.table("jobs").select(SELECT_FIELDS, count="exact")
    if approval_status:
        q = q.eq("approval_status", approval_status)
    if status:
        q = q.eq("status", status)
    if type_:
        q = q.eq("type", type_)
    if work_mode:
        q = q.eq("work_mode", work_mode)
    if is_active is not None:
        q = q.eq("is_active", is_active)
    if search:
        q = q.or_(f"title.ilike.%{search}%,company.ilike.%{search}%,location.ilike.%{search}%,description.ilike.%{search}%")
    offset = (page - 1) * limit
    q = q.order(sort_by, desc=(sort_order == "desc")).range(offset, offset + limit - 1)
    res = q.execute()
    total = res.count or 0
    return {
        "data": res.data,
        "meta": {"total": total, "page": page, "limit": limit, "total_pages": -(-total // limit)}
    }

async def create_job(body, posted_by_id, channel):
    approval = "APPROVED" if channel == "PORTAL" else "PENDING"
    data = body.model_dump()
    data.update({
        "channel": channel,
        "approval_status": approval,
        "posted_by_id": posted_by_id,
        # Coerce dates to strings for Supabase
        "application_deadline": str(data["application_deadline"]) if data.get("application_deadline") else None,
        "due_date": str(data["due_date"]) if data.get("due_date") else None,
    })
    # Remove is_active from create payload (use default)
    data.pop("is_active", None)
    res = sb.table("jobs").insert(data).execute()
    return await get_job(res.data[0]["id"])

async def get_job(job_id):
    res = sb.table("jobs").select(SELECT_FIELDS).eq("id", job_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Job not found")
    return res.data

async def update_job(job_id, body):
    await get_job(job_id)
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    for date_field in ("application_deadline", "due_date"):
        if date_field in data and data[date_field]:
            data[date_field] = str(data[date_field])
    sb.table("jobs").update(data).eq("id", job_id).execute()
    return await get_job(job_id)

async def toggle_job_active(job_id):
    job = await get_job(job_id)
    new_active = not job["is_active"]
    sb.table("jobs").update({"is_active": new_active}).eq("id", job_id).execute()
    return {"id": job_id, "is_active": new_active, "status": job["status"]}

async def approve_job(job_id, approved_by_id, note):
    await get_job(job_id)
    sb.table("jobs").update({
        "approval_status": "APPROVED",
        "approved_by_id": approved_by_id,
        "approved_at": "now()",
        "approval_note": note,
    }).eq("id", job_id).execute()
    return await get_job(job_id)

async def reject_job(job_id, approved_by_id, note):
    await get_job(job_id)
    sb.table("jobs").update({
        "approval_status": "REJECTED",
        "approved_by_id": approved_by_id,
        "approved_at": "now()",
        "approval_note": note,
    }).eq("id", job_id).execute()
    return await get_job(job_id)

async def delete_job(job_id):
    await get_job(job_id)
    # Soft-delete: close and deactivate
    sb.table("jobs").update({"status": "CLOSED", "is_active": False}).eq("id", job_id).execute()
    return {"id": job_id}

async def get_pending_count():
    res = sb.table("jobs").select("id", count="exact").eq("approval_status", "PENDING").execute()
    return res.count or 0
```

### 3.7 Pending count endpoint (shared with candidates)

```python
# Add to routers/approvals.py (or inline in main.py)
@router.get("/api/approvals/pending-count")
async def pending_count(user=Depends(require_roles("ADMIN"))):
    from services.candidates import get_pending_count as c_count
    from services.jobs import get_pending_count as j_count
    c = await c_count()
    j = await j_count()
    return {"data": {"candidates": c, "jobs": j, "total": c + j}}
```

---

## 4. Frontend (Next.js 16 App Router)

### 4.1 File structure

```
app/
  (portal)/
    jobs/
      page.tsx              # JobsListPage
      new/
        page.tsx            # CreateJobPage
      [id]/
        page.tsx            # JobDetailPage
        edit/
          page.tsx          # EditJobPage
    approvals/
      page.tsx              # ApprovalsPage (Candidates tab + Jobs tab)
  (public)/
    post-job/
      page.tsx              # PublicJobFormPage

components/
  jobs/
    JobForm.tsx             # reusable multi-section form
    JobStatusBadge.tsx
    JobTypeBadge.tsx
```

### 4.2 Constants (add to `lib/constants.ts`)

```typescript
export const CONTRACT_TYPES = ["CONTRACT", "CONTRACT_TO_HIRE", "TEMPORARY", "W2"] as const;
export const FULLTIME_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP"] as const;
export type ContractType = typeof CONTRACT_TYPES[number];
export type FulltimeType = typeof FULLTIME_TYPES[number];
export type JobType = ContractType | FulltimeType;

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: "Full-time", PART_TIME: "Part-time", INTERNSHIP: "Internship",
  CONTRACT: "Contract", CONTRACT_TO_HIRE: "Contract-to-Hire",
  TEMPORARY: "Temporary", W2: "W2",
};

export const JOB_STATUS_LABELS = {
  DRAFT: "Draft", OPEN: "Open", CLOSED: "Closed", ON_HOLD: "On Hold",
};

export const WORK_MODE_LABELS = {
  ONSITE: "On-site", REMOTE: "Remote", HYBRID: "Hybrid",
};

export const JOB_STATUS_COLORS = {
  DRAFT:   "bg-gray-100 text-gray-600",
  OPEN:    "bg-emerald-100 text-emerald-700",
  CLOSED:  "bg-red-100 text-red-600",
  ON_HOLD: "bg-amber-100 text-amber-700",
};

export const JOB_TYPE_COLORS: Record<JobType, string> = {
  FULL_TIME:        "bg-blue-50 text-blue-700",
  PART_TIME:        "bg-purple-50 text-purple-700",
  CONTRACT:         "bg-orange-50 text-orange-700",
  CONTRACT_TO_HIRE: "bg-teal-50 text-teal-700",
  TEMPORARY:        "bg-pink-50 text-pink-700",
  INTERNSHIP:       "bg-indigo-50 text-indigo-700",
  W2:               "bg-amber-50 text-amber-700",
};

// For salary/rate display
export function formatSalary(min: number | null, max: number | null, currency = "USD", suffix = ""): string | null {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}${suffix}`;
  if (min != null) return `From ${fmt(min)}${suffix}`;
  if (max != null) return `Up to ${fmt(max)}${suffix}`;
  return null;
}
```

### 4.3 Jobs list page

```tsx
// app/(portal)/jobs/page.tsx
"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { Plus, Search, LayoutGrid, List, ToggleLeft, ToggleRight } from "lucide-react";
import { JOB_STATUS_LABELS, JOB_TYPE_LABELS, WORK_MODE_LABELS,
         JOB_STATUS_COLORS, JOB_TYPE_COLORS, formatSalary,
         CONTRACT_TYPES, FULLTIME_TYPES } from "@/lib/constants";

type ViewMode = "table" | "grid";

export default function JobsPage() {
  const [jobs, setJobs]               = useState<any[]>([]);
  const [meta, setMeta]               = useState({ total: 0, total_pages: 1, page: 1 });
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [typeFilter, setType]         = useState("");
  const [workModeFilter, setWorkMode] = useState("");
  const [activeOnly, setActiveOnly]   = useState(true);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState<ViewMode>(() => {
    try { return (localStorage.getItem("jobsView") as ViewMode) || "table"; } catch { return "table"; }
  });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (workModeFilter) params.set("work_mode", workModeFilter);
    if (activeOnly) params.set("is_active", "true");

    apiFetch<any>(`/api/jobs?${params}`)
      .then(r => { setJobs(r.data); setMeta(r.meta); })
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, typeFilter, workModeFilter, activeOnly]);

  const switchView = (v: ViewMode) => {
    setView(v);
    try { localStorage.setItem("jobsView", v); } catch { /* ignore */ }
  };

  const toggleActive = async (id: string) => {
    await apiFetch(`/api/jobs/${id}/toggle`, { method: "PATCH" });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, is_active: !j.is_active } : j));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job Postings</h1>
          <p className="text-sm text-muted-foreground">{meta.total} jobs</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Table / Grid toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={() => switchView("table")}
              className={`p-2 ${view === "table" ? "bg-primary text-white" : "bg-white text-gray-400"}`}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => switchView("grid")}
              className={`p-2 ${view === "grid" ? "bg-primary text-white" : "bg-white text-gray-400"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Link href="/jobs/new">
            <button className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg text-sm">
              <Plus className="h-4 w-4" /> Post Job
            </button>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-white rounded-xl border">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg"
                 placeholder="Search title, company, location…"
                 value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>

        {/* Status select */}
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border rounded-lg bg-white">
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="DRAFT">Draft</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="CLOSED">Closed</option>
        </select>

        {/* Type select — grouped */}
        <select value={typeFilter} onChange={e => { setType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border rounded-lg bg-white">
          <option value="">All types</option>
          <optgroup label="Permanent">
            {FULLTIME_TYPES.map(t => <option key={t} value={t}>{JOB_TYPE_LABELS[t]}</option>)}
          </optgroup>
          <optgroup label="Contract / Consulting">
            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{JOB_TYPE_LABELS[t]}</option>)}
          </optgroup>
        </select>

        {/* Work mode select */}
        <select value={workModeFilter} onChange={e => { setWorkMode(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border rounded-lg bg-white">
          <option value="">All modes</option>
          <option value="ONSITE">On-site</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
        </select>

        {/* Active-only toggle */}
        <button onClick={() => { setActiveOnly(v => !v); setPage(1); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
            activeOnly ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
          {activeOnly ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          {activeOnly ? "Active only" : "All jobs"}
        </button>
      </div>

      {/* Table or Grid — see sections 4.3.1 and 4.3.2 */}
      {view === "table" ? (
        <JobsTable jobs={jobs} onToggle={toggleActive} loading={loading} />
      ) : (
        <JobsGrid jobs={jobs} onToggle={toggleActive} loading={loading} />
      )}

      {/* Pagination */}
    </div>
  );
}
```

#### 4.3.1 Table view columns

| Column | Content |
|---|---|
| Title / Company | `job.title` bold, `job.company` small muted |
| Location | MapPin icon + `job.location` or `—` |
| Type | `JobTypeBadge` |
| Work Mode | Text: On-site / Remote / Hybrid |
| Salary / Rate | `formatSalary(salary_min, salary_max, currency, "/yr")` for full-time; `formatSalary(pay_rate_min, pay_rate_max, currency, "/hr")` for contract; `—` if none |
| Openings | Users icon + count |
| Status | `JobStatusBadge` |
| Active | `ToggleRight` (emerald) if active, `ToggleLeft` (gray) if not; click calls `/api/jobs/{id}/toggle`; stopPropagation |
| Posted | `createdAt` formatted as "Jan 1, 2025" |
| Actions | Eye link → `/jobs/[id]`, Pencil link → `/jobs/[id]/edit`; stopPropagation |

Rows are clickable → navigate to `/jobs/[id]`.
Sortable columns: title, company, type, openings, status, created_at.

#### 4.3.2 Grid view card

Each card shows:
- Top: `title` + `JobStatusBadge`
- `company` muted
- MapPin + `location` (if set)
- Briefcase + work mode
- DollarSign + salary or pay rate (if set)
- `JobTypeBadge` + openings count
- First 3 required skills as chips; `+N` overflow chip
- Footer: `isActive` toggle (inline) + Eye/Pencil action icons

### 4.4 Multi-section Job Form

The form is **not a wizard** — it is a single scrollable page with distinct card sections. Use shadcn/ui `Card` or plain white bordered divs.

```
Section 1 — Basic Information
  title*                    (text input)
  type*                     (Select grouped: Permanent / Contract / Consulting)
  work_mode*                (Select: On-site / Remote / Hybrid)
  status                    (Select: Open / Draft / On Hold / Closed)

  IF full-time type:
    company*                (text input)
    location                (text input)
  IF contract type:
    end_client_name*        (text — REQUIRED for contracts)
    vendor_name             (text)
    location                (text)

  due_date*                 (date input — REQUIRED — "Deadline to fill this position")
  application_deadline      (date input — optional)
  description*              (Textarea 6 rows)

Section 2 — Client / Vendor Contact Details  (conditional)
  IF full-time type → "Client Contact Details"
    client_contact          (text — "Hiring manager name")
    client_phone            (tel)
    client_email            (email)

  IF contract type → two sub-sections:
    "End Client Contact":
      end_client_contact, end_client_phone, end_client_email
    "Vendor / MSP Contact":
      vendor_contact, vendor_phone, vendor_email

Section 3 — Compensation & Experience
  IF full-time:
    currency selector (USD/EUR/GBP/INR) + salary_min (number)
    salary_max (number)
  IF contract:
    currency selector + pay_rate_min (number, /hr)
    pay_rate_max (number, /hr)
    [bill_rate_min / bill_rate_max are internal fields — show for ADMIN/HR only]
  Always:
    experience_min (number, years)
    experience_max (number, years)
    openings       (number, min 1)

Section 4 — Skills
  required_skills   tag input: type skill + press Enter or click + button → add chip
                    each chip has × remove button
  nice_to_have      same tag-input pattern

Section 5 — Visa / Work Authorization
  16 visa checkboxes in 3-column grid (same visa list as candidates)
  Leave all unchecked = accepts any
```

**Validation (checked on submit):**
- `title` required
- `description` required
- `company` required if full-time type; `end_client_name` required if contract type
- `due_date` required
- `salary_min ≤ salary_max` if both provided
- `pay_rate_min ≤ pay_rate_max` if both provided
- `experience_min ≤ experience_max` if both provided

**Submit payload — contract example:**
```json
{
  "title": "Senior Java Developer",
  "description": "...",
  "company": "Acme Corp",
  "type": "CONTRACT",
  "work_mode": "REMOTE",
  "status": "OPEN",
  "currency": "USD",
  "pay_rate_min": 60,
  "pay_rate_max": 80,
  "experience_min": 5,
  "openings": 2,
  "due_date": "2025-06-30",
  "required_skills": ["Java", "Spring Boot", "AWS"],
  "visa_requirements": ["USC", "GC", "H1B"],
  "end_client_name": "BigBank Inc",
  "end_client_contact": "Jane Smith",
  "end_client_email": "jane@bigbank.com",
  "vendor_name": "TechStaff LLC"
}
```

**After submit (internal form):** navigate to `/jobs/{id}`

### 4.5 Job detail page

Two-column layout (1/3 + 2/3).

**Left column:**
- Status badge + type badge + title + company + Edit button
- `isActive` toggle card with switch (PATCH `/api/jobs/{id}/toggle`)
- Job details card: location, work mode, openings, salary/pay rate, experience range, due date, application deadline, posted by
- Visa requirements chips (blue)
- **If full-time and `client_name` set:** "Client Details" contact block (name, contact, email, phone)
- **If contract and `end_client_name` set:** "End Client" contact block
- **If contract and `vendor_name` set:** "Vendor / MSP" contact block

**Right column:**
- Job description (whitespace-pre-wrap)
- Required skills chips (brand color)
- Nice-to-have chips (gray)
- Posted/Updated timestamps

**ContactBlock component:**
```tsx
function ContactBlock({ name, contact, email, phone }) {
  return (
    <div className="space-y-1.5 text-sm">
      {name    && <p className="font-medium text-gray-800">{name}</p>}
      {contact && <p className="text-gray-600">{contact}</p>}
      {email   && <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>}
      {phone   && <p className="text-gray-600">{phone}</p>}
    </div>
  );
}
```

**Compensation display logic:**
```typescript
const isContract  = CONTRACT_TYPES.includes(job.type);
const salaryText  = !isContract ? formatSalary(job.salary_min, job.salary_max, job.currency, "/yr") : null;
const payRateText = isContract  ? formatSalary(job.pay_rate_min, job.pay_rate_max, job.currency, "/hr") : null;
const expText = job.experience_min != null && job.experience_max != null
  ? `${job.experience_min}–${job.experience_max} years`
  : job.experience_min != null ? `${job.experience_min}+ years`
  : job.experience_max != null ? `Up to ${job.experience_max} years`
  : null;
```

### 4.6 Approvals page — Jobs tab

```
/approvals  (ADMIN only)

Two tabs: Candidates | Jobs

Pending jobs tab — each job card shows:
  - JobTypeBadge, JobStatusBadge, title, company (or end client name for contracts)
  - Location, work mode, openings
  - Compensation: salary or pay rate
  - Required skills chips (first 5)
  - Submission date + channel badge (WEBSITE)
  - approval_note preview (submitter contact for public submissions)
  - Action buttons:
    - "View Details" → Link to /jobs/[id]
    - Approve button (green) → PATCH /api/jobs/{id}/approve {}
    - Reject button (red) → opens modal, confirm with optional note → PATCH /api/jobs/{id}/reject { note }

No marketing toggle on jobs (unlike candidates).
```

**Reject modal:**
```tsx
<dialog>
  <h2>Reject Job Posting</h2>
  <p className="text-sm text-gray-500 mb-3">{job.title} — {job.company}</p>
  <textarea placeholder="Reason for rejection (optional)" value={note} onChange={e => setNote(e.target.value)} rows={3} />
  <div className="flex justify-end gap-2">
    <button onClick={close}>Cancel</button>
    <button onClick={() => rejectJob(job.id, note)} className="bg-red-600 text-white">Reject</button>
  </div>
</dialog>
```

### 4.7 Public post-job form `/post-job`

- No authentication required
- Single scrollable form (not wizard) — same sections as internal form
- Submitter contact fields (name, email*, phone) — stored in `approval_note`
- `channel` = `WEBSITE`, `approval_status` = `PENDING`
- After submit: show branded success screen

**Sections:**
```
1. Job Details
   title*, type*, work_mode*, company / end_client_name (conditional), location, description*

2. Compensation (shown when type is selected)
   salary_min/max (full-time) OR pay_rate_min/max (contract)

3. Requirements
   experience_min, required_skills (tag input), visa_requirements (multi-select dropdown)

4. Contact Details
   submitter: name, email*, phone
   IF full-time: client_contact, client_email, client_phone
   IF contract: end_client_contact, end_client_email, vendor_contact, vendor_email

5. Submit button
```

**Submitter contact encoding:**
```python
approval_note = " | ".join(filter(None, [
    f"Submitted by: {submitter_name}" if submitter_name else None,
    f"Email: {submitter_email}" if submitter_email else None,
    f"Phone: {submitter_phone}" if submitter_phone else None,
]))
```

**After submit:**
```tsx
<div className="text-center p-10">
  <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
  <h2 className="text-2xl font-bold">Job Submitted for Review!</h2>
  <p className="text-gray-500 max-w-md mx-auto">
    Your job posting has been received and is pending review by our team.
    Once approved, it will be matched with qualified candidates. We'll be in touch shortly!
  </p>
</div>
```

---

## 5. Key Differences from Candidates Feature

| Concern | Candidates | Jobs |
|---|---|---|
| Skills storage | Separate `candidate_skills` table (id, skill, level, years_of_exp) | `required_skills text[]` + `nice_to_have text[]` on jobs row |
| File uploads | Resume + documents in Supabase Storage | None |
| AI parsing | NVIDIA Llama parses uploaded resume | N/A |
| Form layout | 4-step wizard | Single-page multi-section form |
| Approval | `is_marketable` toggle + approve/reject | Approve/reject only (no marketing flag) |
| Public form | `/apply` (candidate profile) | `/post-job` (job posting) |
| Conditional sections | None | CONTRACT_TYPES → pay/bill rate + end-client/vendor; FULLTIME_TYPES → salary + client |
| Status field | ACTIVE / INACTIVE / PLACED / BLACKLISTED | DRAFT / OPEN / CLOSED / ON_HOLD |
| isActive | Not present | Separate boolean — hides job without closing it |
| Compensation | Not applicable | Salary (annual) for full-time; pay rate (hourly) for contract |

**CONTRACT_TYPES** = `["CONTRACT", "CONTRACT_TO_HIRE", "TEMPORARY", "W2"]`
**FULLTIME_TYPES** = `["FULL_TIME", "PART_TIME", "INTERNSHIP"]`

These sets drive all conditional rendering. Check `CONTRACT_TYPES.includes(job.type)` before showing pay/bill rate and end-client/vendor sections.

---

## 6. Environment Variables

Same as candidates — no additional variables needed.

**.env (backend):**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FRONTEND_URL=http://localhost:3000
```

**.env.local (frontend):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 7. Implementation Order (suggested for Claude Code)

1. **DB migration** — run the SQL above; add job-specific enums and jobs table
2. **Pydantic models** — `models/jobs.py` with all fields and enums
3. **Jobs service** — `list_jobs`, `get_job`, `create_job`, `update_job`, `delete_job`
4. **isActive toggle + approve/reject** service methods
5. **Jobs router** — all endpoints with role guards
6. **Public router** — add POST `/api/public/jobs`
7. **Pending count endpoint** — update to include jobs count
8. **Constants** — `lib/constants.ts` with type groups, labels, color maps, formatSalary
9. **Jobs list page** — table + grid toggle, all filters, isActive toggle
10. **JobForm component** — multi-section with conditional contract/full-time sections
11. **Create / Edit / Detail pages**
12. **Public `/post-job` page** — no-auth form with submitter contact
13. **Approvals page jobs tab** — pending job cards, approve/reject modal
14. **Sidebar badge** — update pending count query to include jobs

---

*Generated from ByteSoftware recruitment portal implementation. All business logic, validation rules, and UX patterns are preserved — only the tech stack mapping changes.*
