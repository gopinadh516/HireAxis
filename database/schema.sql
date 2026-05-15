-- HireAxis v1 Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- USERS (Manager + Recruiter only in v1)
-- ─────────────────────────────────────────
CREATE TABLE users (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('manager', 'recruiter')),
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- JOBS (created from emails or manually)
-- ─────────────────────────────────────────
CREATE TABLE jobs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT NOT NULL,
  skills           TEXT[] DEFAULT '{}',
  experience_min   INTEGER,
  experience_max   INTEGER,
  location         TEXT,
  headcount        INTEGER DEFAULT 1,
  budget_min       DECIMAL,
  budget_max       DECIMAL,
  description      TEXT,
  raw_email_text   TEXT,            -- original email body stored for reference
  source           TEXT DEFAULT 'email' CHECK (source IN ('email', 'manual')),
  status           TEXT DEFAULT 'draft' CHECK (
                     status IN ('draft', 'pending_approval', 'active', 'searching', 'closed')
                   ),
  created_by       UUID REFERENCES users(id),
  approved_by      UUID REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- JOB ASSIGNMENTS (job → recruiter)
-- ─────────────────────────────────────────
CREATE TABLE job_assignments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  recruiter_id  UUID NOT NULL REFERENCES users(id),
  assigned_by   UUID NOT NULL REFERENCES users(id),
  status        TEXT DEFAULT 'pending' CHECK (
                  status IN ('pending', 'reviewing', 'searching', 'completed')
                ),
  notes         TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CANDIDATES (found via Naukri / LinkedIn)
-- ─────────────────────────────────────────
CREATE TABLE candidates (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  current_title     TEXT,
  current_company   TEXT,
  experience_years  DECIMAL,
  skills            TEXT[] DEFAULT '{}',
  location          TEXT,
  linkedin_url      TEXT,
  naukri_url        TEXT,
  source            TEXT CHECK (source IN ('naukri', 'linkedin', 'manual')),
  raw_data          JSONB,           -- full scraped payload
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- JOB CANDIDATES (search results per job)
-- ─────────────────────────────────────────
CREATE TABLE job_candidates (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id  UUID NOT NULL REFERENCES candidates(id),
  match_score   INTEGER CHECK (match_score BETWEEN 0 AND 100),
  status        TEXT DEFAULT 'sourced' CHECK (
                  status IN ('sourced', 'shortlisted', 'rejected', 'contacted')
                ),
  notes         TEXT,
  added_by      TEXT DEFAULT 'ai' CHECK (added_by IN ('ai', 'recruiter')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

-- ─────────────────────────────────────────
-- EMAIL LOGS (audit trail of parsed emails)
-- ─────────────────────────────────────────
CREATE TABLE email_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id   TEXT UNIQUE,         -- email Message-ID header (dedup)
  subject      TEXT,
  sender       TEXT,
  received_at  TIMESTAMPTZ,
  raw_content  TEXT,
  parsed_data  JSONB,               -- AI-extracted structured job data
  job_id       UUID REFERENCES jobs(id),
  status       TEXT DEFAULT 'pending' CHECK (
                 status IN ('pending', 'parsed', 'job_created', 'failed', 'ignored')
               ),
  error        TEXT,                -- error message if status = 'failed'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- NOTIFICATIONS (real-time via Supabase)
-- ─────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (
               type IN ('new_job_draft', 'job_assigned', 'search_complete', 'search_failed')
             ),
  title      TEXT NOT NULL,
  message    TEXT,
  data       JSONB,                 -- e.g. { job_id, candidate_count }
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_jobs_status        ON jobs(status);
CREATE INDEX idx_jobs_created_by    ON jobs(created_by);
CREATE INDEX idx_assignments_job    ON job_assignments(job_id);
CREATE INDEX idx_assignments_rec    ON job_assignments(recruiter_id);
CREATE INDEX idx_jc_job             ON job_candidates(job_id);
CREATE INDEX idx_jc_score           ON job_candidates(match_score DESC);
CREATE INDEX idx_notif_user_unread  ON notifications(user_id, is_read) WHERE is_read = false;

-- ─────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON job_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────
-- ENABLE REALTIME (for notifications popup)
-- ─────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;

-- ─────────────────────────────────────────
-- SEED: demo users
-- ─────────────────────────────────────────
INSERT INTO users (name, email, role) VALUES
  ('Arjun Sharma',  'arjun@hireaxis.in',  'manager'),
  ('Priya Nair',    'priya@hireaxis.in',  'recruiter'),
  ('Ravi Kumar',    'ravi@hireaxis.in',   'recruiter');

-- ═══════════════════════════════════════════════════════
-- v2 Talents Migration
-- Run each block separately in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Step 1: Rename existing tables
-- ALTER TABLE job_candidates RENAME TO job_talents;
-- ALTER TABLE job_talents RENAME COLUMN candidate_id TO talent_id;
-- ALTER TABLE candidates RENAME TO talents;

-- Step 2: Enums and column extensions
-- CREATE TYPE gender_type     AS ENUM ('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY');
-- CREATE TYPE visa_status     AS ENUM ('USC','GC','GC_EAD','H1B','H4_EAD','L1','L2_EAD','F1_OPT','F1_CPT','STEM_OPT','TN','E3','O1','J1','EAD','OTHER');
-- CREATE TYPE talent_status   AS ENUM ('ACTIVE','INACTIVE','PLACED','BLACKLISTED');
-- CREATE TYPE talent_source   AS ENUM ('INTERNAL','SELF_REGISTERED','REFERRAL','AGENCY','JOB_BOARD');
-- CREATE TYPE skill_level     AS ENUM ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT');
-- CREATE TYPE document_type   AS ENUM ('RESUME','COVER_LETTER','CERTIFICATE','OTHER');
-- CREATE TYPE approval_status AS ENUM ('PENDING','APPROVED','REJECTED');
-- CREATE TYPE channel_type    AS ENUM ('PORTAL','WEBSITE','AGENT');
--
-- ALTER TABLE talents
--   ADD COLUMN IF NOT EXISTS first_name      TEXT,
--   ADD COLUMN IF NOT EXISTS last_name       TEXT,
--   ADD COLUMN IF NOT EXISTS alt_phone       TEXT,
--   ADD COLUMN IF NOT EXISTS dob             DATE,
--   ADD COLUMN IF NOT EXISTS gender          gender_type,
--   ADD COLUMN IF NOT EXISTS address         TEXT,
--   ADD COLUMN IF NOT EXISTS city            TEXT,
--   ADD COLUMN IF NOT EXISTS state           TEXT,
--   ADD COLUMN IF NOT EXISTS country         TEXT DEFAULT 'USA',
--   ADD COLUMN IF NOT EXISTS zip_code        TEXT,
--   ADD COLUMN IF NOT EXISTS total_experience FLOAT,
--   ADD COLUMN IF NOT EXISTS portfolio_url   TEXT,
--   ADD COLUMN IF NOT EXISTS summary         TEXT,
--   ADD COLUMN IF NOT EXISTS visa_status     visa_status,
--   ADD COLUMN IF NOT EXISTS talent_status   talent_status NOT NULL DEFAULT 'ACTIVE',
--   ADD COLUMN IF NOT EXISTS talent_source   talent_source NOT NULL DEFAULT 'INTERNAL',
--   ADD COLUMN IF NOT EXISTS is_marketable   BOOLEAN NOT NULL DEFAULT true,
--   ADD COLUMN IF NOT EXISTS channel         channel_type NOT NULL DEFAULT 'PORTAL',
--   ADD COLUMN IF NOT EXISTS approval_status approval_status NOT NULL DEFAULT 'APPROVED',
--   ADD COLUMN IF NOT EXISTS approval_note   TEXT,
--   ADD COLUMN IF NOT EXISTS created_by_id   UUID REFERENCES users(id),
--   ADD COLUMN IF NOT EXISTS approved_by_id  UUID REFERENCES users(id),
--   ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ,
--   ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW(),
--   ADD COLUMN IF NOT EXISTS employee_id     UUID;

-- Step 3: New tables, indexes, trigger, realtime
-- CREATE TABLE talent_skills (
--   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   talent_id    UUID NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
--   skill        TEXT NOT NULL,
--   level        skill_level,
--   years_of_exp FLOAT,
--   created_at   TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- CREATE TABLE talent_documents (
--   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   talent_id   UUID NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
--   type        document_type NOT NULL DEFAULT 'RESUME',
--   file_name   TEXT NOT NULL,
--   file_url    TEXT NOT NULL,
--   file_size   INT,
--   mime_type   TEXT,
--   uploaded_at TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- CREATE INDEX ON talents(approval_status);
-- CREATE INDEX ON talents(is_marketable);
-- CREATE INDEX ON talents(visa_status);
-- CREATE INDEX ON talents(talent_status);
-- CREATE INDEX ON talents(created_at DESC);
-- CREATE INDEX ON talent_skills(talent_id);
-- CREATE INDEX ON talent_skills(skill);
-- CREATE INDEX ON talent_documents(talent_id);
--
-- CREATE TRIGGER trg_talents_updated_at
--   BEFORE UPDATE ON talents
--   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--
-- ALTER PUBLICATION supabase_realtime ADD TABLE talents;
--
-- Storage: create bucket named 'talent-docs' set to Public in Supabase dashboard.

-- ─────────────────────────────────────────
-- SOURCING TASKS (v2 — talent sourcing agent)
-- Run after talents module migration is applied
-- ─────────────────────────────────────────

-- CREATE TYPE sourcing_status AS ENUM ('queued','running','completed','failed');
--
-- CREATE TABLE sourcing_tasks (
--   id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   job_id        UUID REFERENCES jobs(id) ON DELETE CASCADE,
--   triggered_by  UUID REFERENCES users(id),
--   status        sourcing_status NOT NULL DEFAULT 'queued',
--   results_count INT DEFAULT 0,
--   error         TEXT,
--   started_at    TIMESTAMPTZ,
--   completed_at  TIMESTAMPTZ,
--   created_at    TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- CREATE INDEX ON sourcing_tasks(status);
-- CREATE INDEX ON sourcing_tasks(job_id);

-- ─────────────────────────────────────────
-- TALENT JOB MATCHES (job search agent output)
-- Run after talents module migration is applied
-- ─────────────────────────────────────────

-- CREATE TABLE talent_job_matches (
--   id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   talent_id      UUID NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
--   job_title      TEXT NOT NULL,
--   company        TEXT,
--   location       TEXT,
--   job_url        TEXT,
--   match_score    INT DEFAULT 0,
--   skills_matched TEXT[] DEFAULT '{}',
--   source         TEXT DEFAULT 'agent',  -- 'agent' | 'manual'
--   status         TEXT DEFAULT 'new',    -- 'new' | 'applied' | 'rejected' | 'shortlisted'
--   found_at       TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- CREATE INDEX ON talent_job_matches(talent_id);
-- CREATE INDEX ON talent_job_matches(status);
-- CREATE INDEX ON talent_job_matches(match_score DESC);

-- ─────────────────────────────────────────
-- JOBS v2 MIGRATION — rich job fields
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────
-- ALTER TABLE jobs
--   ADD COLUMN IF NOT EXISTS job_type           TEXT DEFAULT 'FULL_TIME',
--   ADD COLUMN IF NOT EXISTS work_mode          TEXT DEFAULT 'ONSITE',
--   ADD COLUMN IF NOT EXISTS job_status         TEXT DEFAULT 'OPEN',
--   ADD COLUMN IF NOT EXISTS is_active          BOOLEAN DEFAULT true,
--   ADD COLUMN IF NOT EXISTS company            TEXT,
--   ADD COLUMN IF NOT EXISTS channel            TEXT DEFAULT 'PORTAL',
--   ADD COLUMN IF NOT EXISTS approval_status    TEXT DEFAULT 'APPROVED',
--   ADD COLUMN IF NOT EXISTS approval_note      TEXT,
--   ADD COLUMN IF NOT EXISTS salary_min         DECIMAL,
--   ADD COLUMN IF NOT EXISTS salary_max         DECIMAL,
--   ADD COLUMN IF NOT EXISTS currency           TEXT DEFAULT 'USD',
--   ADD COLUMN IF NOT EXISTS pay_rate_min       DECIMAL,
--   ADD COLUMN IF NOT EXISTS pay_rate_max       DECIMAL,
--   ADD COLUMN IF NOT EXISTS bill_rate_min      DECIMAL,
--   ADD COLUMN IF NOT EXISTS bill_rate_max      DECIMAL,
--   ADD COLUMN IF NOT EXISTS required_skills    TEXT[] DEFAULT '{}',
--   ADD COLUMN IF NOT EXISTS nice_to_have       TEXT[] DEFAULT '{}',
--   ADD COLUMN IF NOT EXISTS visa_requirements  TEXT[] DEFAULT '{}',
--   ADD COLUMN IF NOT EXISTS due_date           DATE,
--   ADD COLUMN IF NOT EXISTS application_deadline DATE,
--   ADD COLUMN IF NOT EXISTS openings           INTEGER DEFAULT 1,
--   ADD COLUMN IF NOT EXISTS client_name        TEXT,
--   ADD COLUMN IF NOT EXISTS client_contact     TEXT,
--   ADD COLUMN IF NOT EXISTS client_email       TEXT,
--   ADD COLUMN IF NOT EXISTS client_phone       TEXT,
--   ADD COLUMN IF NOT EXISTS end_client_name    TEXT,
--   ADD COLUMN IF NOT EXISTS end_client_contact TEXT,
--   ADD COLUMN IF NOT EXISTS end_client_email   TEXT,
--   ADD COLUMN IF NOT EXISTS end_client_phone   TEXT,
--   ADD COLUMN IF NOT EXISTS vendor_name        TEXT,
--   ADD COLUMN IF NOT EXISTS vendor_contact     TEXT,
--   ADD COLUMN IF NOT EXISTS vendor_email       TEXT,
--   ADD COLUMN IF NOT EXISTS vendor_phone       TEXT,
--   ADD COLUMN IF NOT EXISTS posted_by_id       UUID REFERENCES users(id);

-- ─────────────────────────────────────────
-- MIGRATION: Case Management columns
-- Run in Supabase SQL Editor if upgrading
-- ─────────────────────────────────────────
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS case_id            TEXT UNIQUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS internal_bill_rate NUMERIC;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS bill_rate_margin   NUMERIC DEFAULT 15;
