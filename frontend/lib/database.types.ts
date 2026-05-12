export type UserRole = "manager" | "recruiter";
export type JobStatus = "draft" | "pending_approval" | "active" | "searching" | "closed";
export type AssignmentStatus = "pending" | "reviewing" | "searching" | "completed";
export type CandidateSource = "naukri" | "linkedin" | "manual";
export type CandidateStatus = "sourced" | "shortlisted" | "rejected" | "contacted";
export type NotificationType = "new_job_draft" | "job_assigned" | "search_complete" | "search_failed";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  skills: string[];
  experience_min: number | null;
  experience_max: number | null;
  location: string | null;
  headcount: number;
  budget_min: number | null;
  budget_max: number | null;
  description: string | null;
  raw_email_text: string | null;
  source: "email" | "manual";
  status: JobStatus;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobAssignment {
  id: string;
  job_id: string;
  recruiter_id: string;
  assigned_by: string;
  status: AssignmentStatus;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  current_title: string | null;
  current_company: string | null;
  experience_years: number | null;
  skills: string[];
  location: string | null;
  linkedin_url: string | null;
  naukri_url: string | null;
  source: CandidateSource | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface JobCandidate {
  id: string;
  job_id: string;
  candidate_id: string;
  match_score: number | null;
  status: CandidateStatus;
  notes: string | null;
  added_by: "ai" | "recruiter";
  created_at: string;
}

export interface EmailLog {
  id: string;
  message_id: string | null;
  subject: string | null;
  sender: string | null;
  received_at: string | null;
  raw_content: string | null;
  parsed_data: Record<string, unknown> | null;
  job_id: string | null;
  status: "pending" | "parsed" | "job_created" | "failed" | "ignored";
  error: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// Supabase Database type map
export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, "id" | "created_at">; Update: Partial<User> };
      jobs: { Row: Job; Insert: Omit<Job, "id" | "created_at" | "updated_at">; Update: Partial<Job> };
      job_assignments: { Row: JobAssignment; Insert: Omit<JobAssignment, "id" | "created_at" | "updated_at">; Update: Partial<JobAssignment> };
      candidates: { Row: Candidate; Insert: Omit<Candidate, "id" | "created_at">; Update: Partial<Candidate> };
      job_candidates: { Row: JobCandidate; Insert: Omit<JobCandidate, "id" | "created_at">; Update: Partial<JobCandidate> };
      email_logs: { Row: EmailLog; Insert: Omit<EmailLog, "id" | "created_at">; Update: Partial<EmailLog> };
      notifications: { Row: Notification; Insert: Omit<Notification, "id" | "created_at">; Update: Partial<Notification> };
    };
  };
}
