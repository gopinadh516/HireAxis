# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev       # localhost:3000
npm run build
npm run lint
```

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Email Agent
```bash
cd agents/email_agent
pip install -r requirements.txt
python main.py    # Connects via IMAP IDLE, drains unread on startup
```

## Architecture Overview

HireAxis is a 3-service India-first ATS built around an email-driven job intake flow:

```
Gmail → Email Agent (Python) → Supabase → Backend (FastAPI) → Frontend (Next.js)
```

**Services:**
- `frontend/` — Next.js 16 + React 19 + TypeScript + Tailwind CSS 4. Uses Supabase JS client directly for reads and realtime subscriptions; writes go through the FastAPI backend.
- `backend/` — FastAPI REST API. Only layer that writes to Supabase with the service-role key. Handles job approval workflow and assignment management.
- `agents/email_agent/` — IMAP IDLE listener. Parses emails + Excel attachments, calls NVIDIA Llama 3.3-70B to extract structured job data, writes job drafts to Supabase.
- `database/` — Supabase PostgreSQL schema SQL (migrations run manually via Supabase dashboard).

## Key Workflows

**Job Creation:** Email arrives → `email_agent` extracts fields via NVIDIA AI → inserts `jobs` row with `status=pending_approval` + `email_logs` row (deduped by `message_id`) → triggers manager notification.

**Approval Flow:** Manager reviews draft → calls `PATCH /jobs/{id}/approve` with `recruiter_id` → backend creates `job_assignments` row + recruiter notification → job status becomes `active`.

**Candidate Search:** Recruiter calls `PATCH /assignments/{id}/start` → assignment status → `searching` → AI agent finds candidates (Naukri/LinkedIn, not yet implemented) → inserts into `job_candidates` with `match_score` and `added_by=ai`.

## Database Tables (Supabase PostgreSQL)

| Table | Purpose |
|-------|---------|
| `users` | Manager + Recruiter profiles; roles: `manager` \| `recruiter` |
| `jobs` | Job drafts and postings; statuses: `draft → pending_approval → active → searching → closed` |
| `job_assignments` | Recruiter-to-job assignments; statuses: `pending → reviewing → searching → completed` |
| `candidates` | Candidate profiles sourced from Naukri/LinkedIn/manual |
| `job_candidates` | Junction table with `match_score` (0–100) and `added_by: ai\|recruiter` |
| `email_logs` | Raw email records; `message_id` is unique (dedup key) |
| `notifications` | Per-user feed; types: `new_job_draft`, `job_assigned`, `search_complete`, `search_failed` |

Realtime enabled on `notifications` and `jobs` tables. Supabase seed data provides 3 demo users (see `database/seed.sql`).

## Frontend Patterns

**Data fetching:** Custom hooks in `hooks/` (`use-manager-dashboard.ts`, `use-recruiter-dashboard.ts`) handle both initial fetch and Supabase realtime subscriptions. New hooks should follow this pattern.

**Realtime:** Subscriptions use `supabase.channel()` with `postgres_changes` events. Cleanup is done in `useEffect` return.

**No auth yet:** Both dashboards use hardcoded user IDs (`MANAGER_ID`, `RECRUITER_ID`) defined at the top of each hook file. Any new pages must follow this same pattern until auth is added.

**UI components:** shadcn/ui components live in `components/ui/`. Use these before reaching for raw HTML. Add new shadcn components via `npx shadcn@latest add <component>`.

**Path alias:** `@/` maps to `frontend/` root (configured in `tsconfig.json`).

## Backend Patterns

**Supabase client:** `db.py` initializes with service-role JWT key for full write access. Never use the anon key in backend code.

**CORS:** Configured for `http://localhost:3000` only. Update `main.py` for production origins.

**Routers:** Each domain area has its own file in `api/` (jobs, assignments, notifications). Add new routes by creating a file in `api/` and including it in `main.py`.

## Email Agent Patterns

**NVIDIA API:** Uses the `openai` SDK pointed at `https://integrate.api.nvidia.com/v1` with model `meta/llama-3.3-70b-instruct`. This is intentional — not OpenAI.

**Excel parsing:** `parser.py` uses `openpyxl` to extract text from `.xlsx` attachments before passing to the LLM extractor.

**Config:** All credentials loaded from `.env` via `config.py`. `MANAGER_USER_ID` is hardcoded in `config.py` as the notification target — update when auth is added.

## Environment Variables

| File | Key Variables |
|------|--------------|
| `frontend/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `backend/.env` | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `NVIDIA_API_KEY` |
| `agents/email_agent/.env` | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `NVIDIA_API_KEY`, `IMAP_HOST`, `IMAP_USER`, `IMAP_PASSWORD` |
