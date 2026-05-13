export type UserRole = "manager" | "recruiter";
export type JobStatus = "draft" | "pending_approval" | "active" | "searching" | "closed";
export type AssignmentStatus = "pending" | "reviewing" | "searching" | "completed";
export type TalentStatus = "sourced" | "shortlisted" | "rejected" | "contacted";
export type CandidateStatus = TalentStatus; // backward compat alias
export type NotificationType = "new_job_draft" | "job_assigned" | "search_complete" | "search_failed";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TalentSourceType = "INTERNAL" | "SELF_REGISTERED" | "REFERRAL" | "AGENCY" | "JOB_BOARD";
export type TalentStatusType = "ACTIVE" | "INACTIVE" | "PLACED" | "BLACKLISTED";
export type VisaStatus =
  | "USC" | "GC" | "GC_EAD" | "H1B" | "H4_EAD" | "L1" | "L2_EAD"
  | "F1_OPT" | "F1_CPT" | "STEM_OPT" | "TN" | "E3" | "O1" | "J1" | "EAD" | "OTHER";

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

export interface AISummary {
  overview: string | null;
  current_role: string | null;
  total_experience_years: number | null;
  professional_experience: Array<{ company: string; role: string; duration: string; highlights: string[] }>;
  clients_and_vendors: string[];
  technical_skills: { primary: string[]; secondary: string[]; tools_platforms: string[] };
  education: Array<{ degree: string; institution: string; year: string | null }>;
  certifications: string[];
  key_strengths: string[];
}

export interface Talent {
  id: string;
  // legacy fields (from original candidates table)
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
  source: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  // new fields
  first_name: string | null;
  last_name: string | null;
  alt_phone: string | null;
  dob: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  total_experience: number | null;
  portfolio_url: string | null;
  summary: string | null;
  visa_status: VisaStatus | null;
  talent_status: TalentStatusType;
  talent_source: TalentSourceType;
  is_marketable: boolean;
  channel: string;
  approval_status: ApprovalStatus;
  approval_note: string | null;
  created_by_id: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  updated_at: string | null;
  employee_id: string | null;
  referred_by: string | null;
  ai_summary: AISummary | null;
}

export type Candidate = Talent; // backward compat alias

export interface JobTalent {
  id: string;
  job_id: string;
  talent_id: string;
  match_score: number | null;
  status: TalentStatus;
  notes: string | null;
  added_by: "ai" | "recruiter";
  created_at: string;
}

export type JobCandidate = JobTalent; // backward compat alias

export interface TalentSkill {
  id: string;
  talent_id: string;
  skill: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" | null;
  years_of_exp: number | null;
  created_at: string;
}

export interface TalentDocument {
  id: string;
  talent_id: string;
  type: "RESUME" | "COVER_LETTER" | "CERTIFICATE" | "OTHER";
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
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

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, "id" | "created_at">; Update: Partial<User> };
      jobs: { Row: Job; Insert: Omit<Job, "id" | "created_at" | "updated_at">; Update: Partial<Job> };
      job_assignments: { Row: JobAssignment; Insert: Omit<JobAssignment, "id" | "created_at" | "updated_at">; Update: Partial<JobAssignment> };
      talents: { Row: Talent; Insert: Omit<Talent, "id" | "created_at">; Update: Partial<Talent> };
      job_talents: { Row: JobTalent; Insert: Omit<JobTalent, "id" | "created_at">; Update: Partial<JobTalent> };
      email_logs: { Row: EmailLog; Insert: Omit<EmailLog, "id" | "created_at">; Update: Partial<EmailLog> };
      notifications: { Row: Notification; Insert: Omit<Notification, "id" | "created_at">; Update: Partial<Notification> };
    };
  };
}
