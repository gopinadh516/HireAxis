"use client";

import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  XIcon,
  SparklesIcon,
  UploadIcon,
  FileTextIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Loader2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { apiUpload } from "@/lib/api";
import {
  CONTRACT_TYPES,
  FULLTIME_TYPES,
  JOB_TYPE_LABELS,
  VISA_STATUS_OPTIONS,
} from "@/lib/constants";
import type { JobType, WorkMode, JobPostingStatus } from "@/lib/database.types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JobFormData {
  title: string;
  job_type: JobType;
  work_mode: WorkMode;
  job_status: JobPostingStatus;
  company: string;
  end_client_name: string;
  location: string;

  application_deadline: string;
  description: string;

  client_contact: string;
  client_email: string;
  client_phone: string;

  end_client_contact: string;
  end_client_email: string;
  end_client_phone: string;

  vendor_name: string;
  vendor_contact: string;
  vendor_email: string;
  vendor_phone: string;

  currency: string;
  salary: string;
  pay_rate: string;
  bill_rate: string;
  experience_min: string;
  openings: string;

  required_skills: string[];
  nice_to_have: string[];
  visa_requirements: string[];

  // Public form only
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string;

  // Internal only
  recruiter_id: string;
}

const EMPTY: JobFormData = {
  title: "", job_type: "FULL_TIME", work_mode: "ONSITE", job_status: "OPEN",
  company: "", end_client_name: "", location: "", application_deadline: "",
  description: "",
  client_contact: "", client_email: "", client_phone: "",
  end_client_contact: "", end_client_email: "", end_client_phone: "",
  vendor_name: "", vendor_contact: "", vendor_email: "", vendor_phone: "",
  currency: "USD", salary: "", pay_rate: "", bill_rate: "",
  experience_min: "", openings: "1",
  required_skills: [], nice_to_have: [],
  visa_requirements: ["USC", "GC", "GC_EAD"],
  submitter_name: "", submitter_email: "", submitter_phone: "",
  recruiter_id: "",
};

function isContract(type: string) {
  return (CONTRACT_TYPES as readonly string[]).includes(type);
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 mt-1">
      {children}
    </h3>
  );
}

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setInput("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
    if (e.key === "Backspace" && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="rounded-md border border-input bg-background px-2 py-1.5 min-h-[36px] flex flex-wrap gap-1.5 focus-within:ring-1 focus-within:ring-ring">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="hover:text-destructive">
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : ""}
      />
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export interface Recruiter {
  id: string;
  name: string;
  email: string;
}

export function JobForm({
  mode = "internal",
  initialData,
  onSubmit,
  submitting,
  recruiters = [],
}: {
  mode?: "internal" | "public";
  initialData?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => void;
  submitting?: boolean;
  recruiters?: Recruiter[];
}) {
  const [data, setData] = useState<JobFormData>(() => {
    const merged = { ...EMPTY, ...initialData };
    if (!merged.visa_requirements || merged.visa_requirements.length === 0) {
      merged.visa_requirements = ["USC", "GC", "GC_EAD"];
    }
    return merged;
  });
  const [errors, setErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});

  const [contactOpen, setContactOpen] = useState(false);

  // AI parse state
  const [aiTab, setAiTab] = useState<"upload" | "paste">("paste");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [aiError, setAiError] = useState("");

  function set<K extends keyof JobFormData>(field: K, value: JobFormData[K]) {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  const contract = isContract(data.job_type);

  async function handleAiParse() {
    if (aiTab === "upload" && !aiFile) { setAiError("Select a PDF or Word file first."); return; }
    if (aiTab === "paste" && !aiText.trim()) { setAiError("Paste a job description first."); return; }
    setAiLoading(true);
    setAiFilled(false);
    setAiError("");
    try {
      const fd = new FormData();
      if (aiTab === "upload" && aiFile) fd.append("file", aiFile);
      else fd.append("text", aiText.trim());
      const result = await apiUpload<Partial<JobFormData>>("/api/jobs/parse-jd", fd);
      setData((prev) => {
        const merged = { ...prev };
        for (const [k, v] of Object.entries(result)) {
          if (Array.isArray(v)) { if (v.length > 0) (merged as Record<string, unknown>)[k] = v; }
          else if (v !== null && v !== undefined && v !== "") (merged as Record<string, unknown>)[k] = v;
        }
        // Always keep the three defaults, then add only explicitly mentioned visas
        const rawText = (aiTab === "paste" ? aiText : "").toLowerCase();
        const autoVisas = new Set<string>(["USC", "GC", "GC_EAD"]);
        if (/\bh1b\b|\bh-1b\b/.test(rawText)) autoVisas.add("H1B");
        if (/\bead\b/.test(rawText)) { autoVisas.add("EAD"); autoVisas.add("H4_EAD"); autoVisas.add("L2_EAD"); }
        if (/\bopt\b|\bf1[\s-]?opt\b/.test(rawText)) autoVisas.add("F1_OPT");
        if (/\bstem[\s-]?opt\b/.test(rawText)) { autoVisas.add("STEM_OPT"); autoVisas.add("F1_OPT"); }
        if (/\bcpt\b/.test(rawText)) autoVisas.add("F1_CPT");
        if (/\bl1\b|\bl-1\b/.test(rawText)) autoVisas.add("L1");
        if (/\btn\b/.test(rawText)) autoVisas.add("TN");
        merged.visa_requirements = Array.from(autoVisas);
        return merged;
      });
      setAiFilled(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI analysis failed — try again");
    } finally {
      setAiLoading(false);
    }
  }

  function validate() {
    const errs: typeof errors = {};
    if (!data.title.trim()) errs.title = "Title is required";
    if (!data.description.trim()) errs.description = "Description is required";

    if (!contract && !data.company.trim()) errs.company = "Company is required";
    if (mode === "public" && !data.submitter_email.trim()) errs.submitter_email = "Your email is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── AI Auto-fill (internal only) ── */}
      {mode === "internal" && (
        <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Auto-fill with AI</h3>
            <span className="ml-auto text-[10px] text-muted-foreground hidden sm:inline">
              Upload a JD document or paste text — AI extracts and fills the form
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-border">
            <button
              type="button"
              onClick={() => { setAiTab("paste"); setAiError(""); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${aiTab === "paste" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <FileTextIcon className="size-3.5" />Paste Text
            </button>
            <button
              type="button"
              onClick={() => { setAiTab("upload"); setAiError(""); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${aiTab === "upload" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <UploadIcon className="size-3.5" />Upload File
            </button>
          </div>

          {aiTab === "paste" ? (
            <Textarea
              value={aiText}
              onChange={(e) => { setAiText(e.target.value); setAiError(""); setAiFilled(false); }}
              rows={6}
              placeholder="Paste the full job description here…"
              className="text-sm resize-none"
            />
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <UploadIcon className="size-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground text-center">
                {aiFile ? (
                  <span className="text-foreground font-medium">{aiFile.name}</span>
                ) : (
                  <>Click to upload or drag a file<br /><span className="text-[11px]">PDF, DOC, DOCX</span></>
                )}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={(e) => {
                  setAiFile(e.target.files?.[0] ?? null);
                  setAiError("");
                  setAiFilled(false);
                }}
              />
            </label>
          )}

          {/* Progress steps during analysis */}
          {aiLoading && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 space-y-2.5">
              <p className="text-xs font-medium text-primary flex items-center gap-2">
                <Loader2Icon className="size-3.5 animate-spin" />
                Analyzing with AI — this takes 10–20 seconds…
              </p>
              <div className="space-y-1.5 pl-5">
                {[
                  "Reading job description",
                  "Extracting title, type & location",
                  "Identifying skills & requirements",
                  "Parsing compensation & visa info",
                  "Filling form fields",
                ].map((step, i) => (
                  <p key={step} className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span className="inline-block size-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />
                    {step}
                  </p>
                ))}
              </div>
            </div>
          )}

          {aiError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircleIcon className="size-3.5 shrink-0" />{aiError}
            </div>
          )}

          {aiFilled && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
              <CheckCircle2Icon className="size-3.5 shrink-0" />
              Form fields pre-filled — review and edit below before saving.
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={aiLoading}
            onClick={handleAiParse}
            className="gap-2"
          >
            {aiLoading
              ? <Loader2Icon className="size-3.5 animate-spin" />
              : <SparklesIcon className="size-3.5" />}
            {aiLoading ? "Analyzing JD…" : "Analyze with AI"}
          </Button>
        </div>
      )}

      {/* ── Section 1: Basic Info ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <SectionTitle>Basic Information</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Job Title" required>
              <Input value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Senior Java Developer" className="h-8 text-sm" />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </Field>
          </div>

          <Field label="Job Type" required>
            <Select value={data.job_type} onValueChange={(v) => set("job_type", v as JobType)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Permanent</div>
                {FULLTIME_TYPES.map((t) => <SelectItem key={t} value={t}>{JOB_TYPE_LABELS[t]}</SelectItem>)}
                <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground border-t mt-1 pt-2">Contract / Consulting</div>
                {CONTRACT_TYPES.map((t) => <SelectItem key={t} value={t}>{JOB_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Work Mode" required>
            <Select value={data.work_mode} onValueChange={(v) => set("work_mode", v as WorkMode)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ONSITE">On-site</SelectItem>
                <SelectItem value="REMOTE">Remote</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {mode === "internal" && (
            <Field label="Posting Status">
              <Select value={data.job_status} onValueChange={(v) => set("job_status", v as JobPostingStatus)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          {contract ? (
            <Field label="End Client / Company">
              <Input value={data.end_client_name} onChange={(e) => set("end_client_name", e.target.value)} placeholder="e.g. BigBank Inc (optional)" className="h-8 text-sm" />
            </Field>
          ) : (
            <>
              <Field label="Company" required>
                <Input value={data.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Acme Corp" className="h-8 text-sm" />
                {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
              </Field>
              <Field label="End Client Name">
                <Input value={data.end_client_name} onChange={(e) => set("end_client_name", e.target.value)} placeholder="e.g. BigBank Inc (optional)" className="h-8 text-sm" />
              </Field>
            </>
          )}

          <Field label="Location">
            <Input value={data.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Austin, TX or Remote" className="h-8 text-sm" />
          </Field>

          <Field label="Experience Required (yrs)">
            <Input type="number" min={0} value={data.experience_min} onChange={(e) => set("experience_min", e.target.value)} className="h-8 text-sm" placeholder="e.g. 3" />
          </Field>

          <Field label="Application Deadline">
            <Input type="date" value={data.application_deadline} onChange={(e) => set("application_deadline", e.target.value)} className="h-8 text-sm" />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Job Description" required>
              <Textarea value={data.description} onChange={(e) => set("description", e.target.value)} rows={10} placeholder="AI-generated summary appears here after parsing, or type manually…" className="text-sm resize-none" />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
            </Field>
          </div>
        </div>
      </div>

      {/* ── Section 2: Client / Vendor Contacts (collapsible) ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setContactOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-accent transition-colors"
        >
          <span className="text-sm font-medium">
            {contract ? "End Client & Vendor Contact" : "Client Contact Details"}
            <span className="ml-2 text-xs font-normal text-muted-foreground">optional</span>
          </span>
          {contactOpen
            ? <ChevronUpIcon className="size-4 text-muted-foreground" />
            : <ChevronDownIcon className="size-4 text-muted-foreground" />}
        </button>

        {contactOpen && (
          <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border">
            {contract ? (
              <div className="space-y-4">
                <p className="text-[11px] text-muted-foreground font-medium pt-2">End Client</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Contact Name"><Input value={data.end_client_contact} onChange={(e) => set("end_client_contact", e.target.value)} className="h-8 text-sm" placeholder="Jane Smith" /></Field>
                  <Field label="Email"><Input type="email" value={data.end_client_email} onChange={(e) => set("end_client_email", e.target.value)} className="h-8 text-sm" placeholder="jane@client.com" /></Field>
                  <Field label="Phone"><Input type="tel" value={data.end_client_phone} onChange={(e) => set("end_client_phone", e.target.value)} className="h-8 text-sm" placeholder="+1 555 000 0000" /></Field>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium border-t pt-3 mt-2">Vendor / MSP</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Vendor Name"><Input value={data.vendor_name} onChange={(e) => set("vendor_name", e.target.value)} className="h-8 text-sm" placeholder="TechStaff LLC" /></Field>
                  <Field label="Contact Name"><Input value={data.vendor_contact} onChange={(e) => set("vendor_contact", e.target.value)} className="h-8 text-sm" placeholder="John Doe" /></Field>
                  <Field label="Email"><Input type="email" value={data.vendor_email} onChange={(e) => set("vendor_email", e.target.value)} className="h-8 text-sm" placeholder="john@vendor.com" /></Field>
                  <Field label="Phone"><Input type="tel" value={data.vendor_phone} onChange={(e) => set("vendor_phone", e.target.value)} className="h-8 text-sm" placeholder="+1 555 000 0000" /></Field>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                <Field label="Hiring Manager"><Input value={data.client_contact} onChange={(e) => set("client_contact", e.target.value)} className="h-8 text-sm" placeholder="Contact name" /></Field>
                <Field label="Email"><Input type="email" value={data.client_email} onChange={(e) => set("client_email", e.target.value)} className="h-8 text-sm" placeholder="hr@company.com" /></Field>
                <Field label="Phone"><Input type="tel" value={data.client_phone} onChange={(e) => set("client_phone", e.target.value)} className="h-8 text-sm" placeholder="+1 555 000 0000" /></Field>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 3: Compensation & Experience ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <SectionTitle>Compensation & Experience</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Currency">
            <Select value={data.currency} onValueChange={(v) => set("currency", v ?? "USD")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["USD", "EUR", "GBP", "INR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {contract ? (
            <>
              {mode === "internal" && (
                <Field label="Bill Rate (per hour)">
                  <Input type="number" min={0} value={data.bill_rate} onChange={(e) => set("bill_rate", e.target.value)} className="h-8 text-sm" placeholder="e.g. 95" />
                </Field>
              )}
            </>
          ) : (
            <Field label="Annual Compensation">
              <Input type="number" min={0} value={data.salary} onChange={(e) => set("salary", e.target.value)} className="h-8 text-sm" placeholder="e.g. 120000" />
            </Field>
          )}

          <Field label="Openings">
            <Input type="number" min={1} value={data.openings} onChange={(e) => set("openings", e.target.value)} className="h-8 text-sm" />
          </Field>
        </div>
      </div>

      {/* ── Section 4: Skills ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <SectionTitle>Skills</SectionTitle>
        <Field label="Required Skills">
          <TagInput value={data.required_skills} onChange={(v) => set("required_skills", v)} placeholder="Type skill and press Enter…" />
        </Field>
        <Field label="Nice to Have">
          <TagInput value={data.nice_to_have} onChange={(v) => set("nice_to_have", v)} placeholder="Type skill and press Enter…" />
        </Field>
      </div>

      {/* ── Section 5: Visa Requirements ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <SectionTitle>Visa / Work Authorization</SectionTitle>
        <p className="text-xs text-muted-foreground">Leave all unchecked to accept any visa status.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {VISA_STATUS_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-input"
                checked={data.visa_requirements.includes(value)}
                onChange={(e) =>
                  set(
                    "visa_requirements",
                    e.target.checked
                      ? [...data.visa_requirements, value]
                      : data.visa_requirements.filter((v) => v !== value)
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Section 6: Submitter Contact (public only) ── */}
      {mode === "public" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <SectionTitle>Your Contact Details</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Your Name">
              <Input value={data.submitter_name} onChange={(e) => set("submitter_name", e.target.value)} className="h-8 text-sm" placeholder="Full name" />
            </Field>
            <Field label="Your Email" required>
              <Input type="email" value={data.submitter_email} onChange={(e) => set("submitter_email", e.target.value)} className="h-8 text-sm" placeholder="you@company.com" />
              {errors.submitter_email && <p className="text-xs text-destructive mt-1">{errors.submitter_email}</p>}
            </Field>
            <Field label="Your Phone">
              <Input type="tel" value={data.submitter_phone} onChange={(e) => set("submitter_phone", e.target.value)} className="h-8 text-sm" placeholder="+1 555 000 0000" />
            </Field>
          </div>
        </div>
      )}

      {/* ── Section: Assign Recruiter (internal only) ── */}
      {mode === "internal" && recruiters.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <SectionTitle>Assign Recruiter</SectionTitle>
          <Field label="Recruiter">
            <Select value={data.recruiter_id} onValueChange={(v) => set("recruiter_id", v ?? "")}>
              <SelectTrigger className="h-8 text-sm">
                {data.recruiter_id
                  ? <span>{recruiters.find((r) => r.id === data.recruiter_id)?.name ?? "Selected"}</span>
                  : <SelectValue placeholder="Select a recruiter (optional)…" />}
              </SelectTrigger>
              <SelectContent>
                {recruiters.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.email && <span className="ml-1.5 text-muted-foreground text-xs">({r.email})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {/* ── Submit ── */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "public" ? "Submit Job for Review" : "Save Job"}
        </Button>
      </div>
    </form>
  );
}
