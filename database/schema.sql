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
