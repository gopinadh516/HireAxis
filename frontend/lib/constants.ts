export const VISA_STATUS_LABELS: Record<string, string> = {
  USC: "US Citizen",
  GC: "Green Card",
  GC_EAD: "GC EAD",
  H1B: "H1B",
  H4_EAD: "H4 EAD",
  L1: "L1",
  L2_EAD: "L2 EAD",
  F1_OPT: "F1 OPT",
  F1_CPT: "F1 CPT",
  STEM_OPT: "STEM OPT",
  TN: "TN",
  E3: "E3",
  O1: "O1",
  J1: "J1",
  EAD: "EAD",
  OTHER: "Other",
};

export const VISA_STATUS_OPTIONS = Object.entries(VISA_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

export const TALENT_SOURCE_LABELS: Record<string, string> = {
  INTERNAL: "Internal",
  SELF_REGISTERED: "Self Applied",
  REFERRAL: "Referral",
  AGENCY: "Agency",
  JOB_BOARD: "Job Board",
};

export const TALENT_SOURCE_OPTIONS = Object.entries(TALENT_SOURCE_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export const APPROVAL_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
};

// ── Jobs ─────────────────────────────────────────────────────────────────────

export const CONTRACT_TYPES = ["CONTRACT", "CONTRACT_TO_HIRE", "TEMPORARY", "W2"] as const;
export const FULLTIME_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];
export type FulltimeType = (typeof FULLTIME_TYPES)[number];
export type JobType = ContractType | FulltimeType;

export const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME:        "Full-time",
  PART_TIME:        "Part-time",
  INTERNSHIP:       "Internship",
  CONTRACT:         "Contract",
  CONTRACT_TO_HIRE: "Contract-to-Hire",
  TEMPORARY:        "Temporary",
  W2:               "W2",
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  NEW:                "New",
  PENDING_VALIDATION: "Pending Validation",
  DRAFT:              "Draft",
  OPEN:               "Open",
  CLOSED:             "Closed",
  ON_HOLD:            "On Hold",
};

export const WORK_MODE_LABELS: Record<string, string> = {
  ONSITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

export const JOB_STATUS_COLORS: Record<string, string> = {
  NEW:                "bg-sky-100 text-sky-700 border-sky-200",
  PENDING_VALIDATION: "bg-amber-100 text-amber-700 border-amber-200",
  DRAFT:              "bg-gray-100 text-gray-600 border-gray-200",
  OPEN:               "bg-emerald-100 text-emerald-700 border-emerald-200",
  CLOSED:             "bg-red-100 text-red-600 border-red-200",
  ON_HOLD:            "bg-amber-100 text-amber-700 border-amber-200",
};

export const JOB_TYPE_COLORS: Record<string, string> = {
  FULL_TIME:        "bg-blue-50 text-blue-700 border-blue-200",
  PART_TIME:        "bg-purple-50 text-purple-700 border-purple-200",
  CONTRACT:         "bg-orange-50 text-orange-700 border-orange-200",
  CONTRACT_TO_HIRE: "bg-teal-50 text-teal-700 border-teal-200",
  TEMPORARY:        "bg-pink-50 text-pink-700 border-pink-200",
  INTERNSHIP:       "bg-indigo-50 text-indigo-700 border-indigo-200",
  W2:               "bg-amber-50 text-amber-700 border-amber-200",
};

// ── Deadline urgency ──────────────────────────────────────────────────────────

export type Urgency = "high" | "medium" | "low";

export function getUrgency(deadline: string | null | undefined): Urgency | null {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return null; // past deadline — no urgency badge
  if (days <= 7)  return "high";
  if (days <= 14) return "medium";
  return "low";
}

export function urgencyDaysLeft(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  return days >= 0 ? days : null;
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  high:   "High Urgency",
  medium: "Medium",
  low:    "Low",
};

export const URGENCY_CLASS: Record<Urgency, string> = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low:    "bg-green-100 text-green-700 border-green-200",
};

export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = "USD",
  suffix = ""
): string | null {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}${suffix}`;
  if (min != null) return `From ${fmt(min)}${suffix}`;
  if (max != null) return `Up to ${fmt(max)}${suffix}`;
  return null;
}

export function formatJobId(job: { job_number?: number | null }): string {
  if (job.job_number != null) return `JOB-${job.job_number.toString().padStart(3, "0")}`;
  return "JOB-???";
}
