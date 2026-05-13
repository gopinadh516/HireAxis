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
