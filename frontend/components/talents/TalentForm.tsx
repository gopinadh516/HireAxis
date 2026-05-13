"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VISA_STATUS_OPTIONS, GENDER_OPTIONS, SKILL_LEVELS } from "@/lib/constants";
import { apiUpload } from "@/lib/api";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  PlusIcon,
  XIcon,
  UploadCloudIcon,
  CheckCircleIcon,
  LoaderIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SkillRow {
  skill: string;
  level: string;
  years_of_exp: string;
}

export interface TalentFormData {
  // Step 1 — Personal
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  alt_phone: string;
  dob: string;
  gender: string;
  visa_status: string;
  referred_by: string;
  // Step 2 — Address
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  // Step 3 — Professional
  current_title: string;
  current_company: string;
  total_experience: string;
  linkedin_url: string;
  portfolio_url: string;
  summary: string;
  // Step 4 — Skills
  skills: SkillRow[];
  // file (not submitted as JSON)
  resumeFile?: File;
}

export type TalentFormMode = "create" | "edit" | "public";

interface TalentFormProps {
  mode: TalentFormMode;
  defaultValues?: Partial<TalentFormData>;
  onSubmit: (data: TalentFormData) => Promise<void>;
  submitting?: boolean;
}

const STEPS = ["Personal", "Address", "Professional", "Skills"];

const empty: TalentFormData = {
  first_name: "", last_name: "", email: "", phone: "", alt_phone: "",
  dob: "", gender: "", visa_status: "", referred_by: "",
  address: "", city: "", state: "", country: "USA", zip_code: "",
  current_title: "", current_company: "", total_experience: "",
  linkedin_url: "", portfolio_url: "", summary: "",
  skills: [{ skill: "", level: "", years_of_exp: "" }],
};

// ── Validation ────────────────────────────────────────────────────────────────

function validateStep(step: number, data: TalentFormData, mode: TalentFormMode): string | null {
  if (step === 0) {
    if (!data.first_name.trim()) return "First name is required";
    if (!data.last_name.trim())  return "Last name is required";
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Enter a valid email";
    if (!data.visa_status) return "Visa status is required";
    if (mode === "public") {
      if (!data.email.trim()) return "Email is required";
      if (!data.phone.trim() || data.phone.length < 7) return "Valid phone number is required";
    }
  }
  if (step === 2) {
    if (data.linkedin_url && !data.linkedin_url.startsWith("https://"))
      return "LinkedIn URL must start with https://";
    if (mode === "public" && !data.linkedin_url.trim())
      return "LinkedIn URL is required";
  }
  if (step === 3) {
    for (const row of data.skills) {
      if (row.skill.trim() === "" && data.skills.length > 1)
        return "Remove empty skill rows before saving";
    }
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function TalentForm({ mode, defaultValues, onSubmit, submitting }: TalentFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<TalentFormData>({ ...empty, ...defaultValues });
  const [error, setError] = useState<string | null>(null);

  // AI resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedOk, setParsedOk] = useState(false);

  const set = useCallback((field: keyof TalentFormData, value: string) => {
    setData((d) => ({ ...d, [field]: value }));
  }, []);

  // ── Skill rows ──────────────────────────────────────────────────────────────

  function setSkill(index: number, field: keyof SkillRow, value: string) {
    setData((d) => {
      const skills = [...d.skills];
      skills[index] = { ...skills[index], [field]: value };
      return { ...d, skills };
    });
  }

  function addSkill() {
    setData((d) => ({ ...d, skills: [...d.skills, { skill: "", level: "", years_of_exp: "" }] }));
  }

  function removeSkill(index: number) {
    setData((d) => ({ ...d, skills: d.skills.filter((_, i) => i !== index) }));
  }

  // ── AI resume parse ─────────────────────────────────────────────────────────

  async function handleResumeUpload(file: File) {
    setResumeFile(file);
    setParsing(true);
    setParsedOk(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const endpoint = mode === "public" ? "/api/public/parse-resume" : "/api/talents/parse-resume";
      const parsed = await apiUpload<Record<string, unknown>>(endpoint, fd);

      setData((d) => ({
        ...d,
        first_name:       (parsed.first_name as string)       || d.first_name,
        last_name:        (parsed.last_name as string)        || d.last_name,
        email:            (parsed.email as string)            || d.email,
        phone:            (parsed.phone as string)            || d.phone,
        current_title:    (parsed.current_title as string)    || d.current_title,
        current_company:  (parsed.current_company as string)  || d.current_company,
        total_experience: parsed.total_experience != null ? String(parsed.total_experience) : d.total_experience,
        linkedin_url:     (parsed.linkedin_url as string)     || d.linkedin_url,
        city:             (parsed.city as string)             || d.city,
        state:            (parsed.state as string)            || d.state,
        country:          (parsed.country as string)          || d.country,
        visa_status:      (parsed.visa_status as string)      || d.visa_status,
        summary:          (parsed.summary as string)          || d.summary,
        skills: Array.isArray(parsed.skills) && parsed.skills.length > 0
          ? (parsed.skills as Array<{ skill: string; level?: string; years_of_exp?: number }>).map((s) => ({
              skill: s.skill || "",
              level: s.level || "",
              years_of_exp: s.years_of_exp != null ? String(s.years_of_exp) : "",
            }))
          : d.skills,
        resumeFile: file,
      }));
      setParsedOk(true);
    } catch {
      // parsing failure is non-fatal — user can fill manually
    } finally {
      setParsing(false);
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function next() {
    const err = validateStep(step, data, mode);
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    const err = validateStep(step, data, mode);
    if (err) { setError(err); return; }
    setError(null);
    // Strip out empty skill rows before submitting
    const cleaned = { ...data, skills: data.skills.filter((s) => s.skill.trim()) };
    await onSubmit({ ...cleaned, resumeFile: resumeFile ?? undefined });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
              i < step  ? "bg-primary text-primary-foreground" :
              i === step ? "bg-primary text-primary-foreground" :
                           "bg-muted text-muted-foreground"
            }`}>
              {i < step ? <CheckCircleIcon className="size-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {/* ── Step 1: Personal ── */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Personal Information</h3>

            {/* AI resume upload — top of step 1 */}
            <div className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
              parsedOk ? "border-emerald-300 bg-emerald-50" : "border-border hover:border-primary/40"
            }`}>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); }}
                />
                <div className="flex flex-col items-center gap-2">
                  {parsing ? (
                    <LoaderIcon className="size-6 animate-spin text-primary" />
                  ) : parsedOk ? (
                    <CheckCircleIcon className="size-6 text-emerald-600" />
                  ) : (
                    <UploadCloudIcon className="size-6 text-muted-foreground" />
                  )}
                  <p className="text-xs font-medium">
                    {parsing  ? "Analyzing resume with AI…"      :
                     parsedOk ? `Resume parsed — ${resumeFile?.name}` :
                                "Upload Resume (PDF/DOCX) to auto-fill all fields"}
                  </p>
                  {!parsing && !parsedOk && (
                    <p className="text-[11px] text-muted-foreground">Click to browse · PDF or DOCX</p>
                  )}
                  {parsedOk && (
                    <label className="cursor-pointer text-[11px] text-primary underline underline-offset-2">
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); }}
                      />
                      Upload a different file
                    </label>
                  )}
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *">
                <Input value={data.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="John" />
              </Field>
              <Field label="Last Name *">
                <Input value={data.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Doe" />
              </Field>
            </div>
            <Field label={mode === "public" ? "Email *" : "Email"}>
              <Input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={mode === "public" ? "Phone *" : "Phone"}>
                <Input value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
              </Field>
              <Field label="Alt Phone">
                <Input value={data.alt_phone} onChange={(e) => set("alt_phone", e.target.value)} placeholder="Optional" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date of Birth">
                <Input type="date" value={data.dob} onChange={(e) => set("dob", e.target.value)} />
              </Field>
              <Field label="Gender">
                <Select value={data.gender} onValueChange={(v) => set("gender", v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Visa Status *">
              <Select value={data.visa_status} onValueChange={(v) => set("visa_status", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select visa status" /></SelectTrigger>
                <SelectContent>
                  {VISA_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={mode === "public" ? "Referred By (optional)" : "Referred By"}>
              <Input
                value={data.referred_by}
                onChange={(e) => set("referred_by", e.target.value)}
                placeholder={mode === "public" ? "Name of the person who referred you" : "Name of the person who referred this talent (optional)"}
              />
            </Field>
          </div>
        )}

        {/* ── Step 2: Address ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Address</h3>
            <Field label="Street Address">
              <Input value={data.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City">
                <Input value={data.city} onChange={(e) => set("city", e.target.value)} placeholder="New York" />
              </Field>
              <Field label="State">
                <Input value={data.state} onChange={(e) => set("state", e.target.value)} placeholder="NY" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Country">
                <Input value={data.country} onChange={(e) => set("country", e.target.value)} placeholder="USA" />
              </Field>
              <Field label="Zip Code">
                <Input value={data.zip_code} onChange={(e) => set("zip_code", e.target.value)} placeholder="10001" />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 3: Professional ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Professional Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Current Title">
                <Input value={data.current_title} onChange={(e) => set("current_title", e.target.value)} placeholder="Software Engineer" />
              </Field>
              <Field label="Current Company">
                <Input value={data.current_company} onChange={(e) => set("current_company", e.target.value)} placeholder="Acme Inc." />
              </Field>
            </div>
            <Field label="Total Experience (years)">
              <Input type="number" min="0" step="0.5" value={data.total_experience} onChange={(e) => set("total_experience", e.target.value)} placeholder="5" />
            </Field>
            <Field label={mode === "public" ? "LinkedIn URL *" : "LinkedIn URL"}>
              <Input value={data.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
            </Field>
            <Field label="Portfolio / Website">
              <Input value={data.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Summary">
              <textarea
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                value={data.summary}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="Brief professional summary…"
              />
            </Field>
          </div>
        )}

        {/* ── Step 4: Skills ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Skills</h3>
            <div className="space-y-2">
              {data.skills.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Skill name *"
                    value={row.skill}
                    onChange={(e) => setSkill(i, "skill", e.target.value)}
                  />
                  <Select value={row.level} onValueChange={(v) => setSkill(i, "level", v ?? "")}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-24"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Yrs"
                    value={row.years_of_exp}
                    onChange={(e) => setSkill(i, "years_of_exp", e.target.value)}
                  />
                  {data.skills.length > 1 && (
                    <button onClick={() => removeSkill(i)} className="text-muted-foreground hover:text-destructive">
                      <XIcon className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addSkill} className="gap-1.5">
              <PlusIcon className="size-3.5" /> Add Skill
            </Button>
          </div>
        )}

        {/* Error */}
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </Card>

      {/* Navigation */}
      <div className="mt-4 flex justify-between">
        <Button variant="outline" onClick={back} disabled={step === 0} className="gap-1.5">
          <ChevronLeftIcon className="size-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} className="gap-1.5">
            Next <ChevronRightIcon className="size-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5 min-w-28">
            {submitting ? <LoaderIcon className="size-4 animate-spin" /> : null}
            {mode === "public" ? "Submit Application" : step === 3 && "Save Talent"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
