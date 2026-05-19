"use client";

import { useState, useCallback, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { JobTypeBadge } from "@/components/jobs/JobTypeBadge";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { useJobs } from "@/hooks/use-jobs";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  SearchIcon, BriefcaseIcon, MapPinIcon, UsersIcon,
  PlusIcon, XIcon, InboxIcon, ToggleLeftIcon, ToggleRightIcon,
  PencilIcon, TrashIcon, MailIcon, GlobeIcon, Building2Icon, BotIcon,
} from "lucide-react";
import {
  JOB_TYPE_LABELS, CONTRACT_TYPES, FULLTIME_TYPES, WORK_MODE_LABELS, formatSalary,
  getUrgency, urgencyDaysLeft, URGENCY_LABEL, URGENCY_CLASS, formatJobId,
} from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import type { Job } from "@/lib/database.types";

// ── Basket config ─────────────────────────────────────────────────────────────

type BasketKey = "email" | "website" | "internal" | "ai_search";

interface BasketCount { total: number; new: number; validating: number; active: number; closed: number; }
type BasketCounts = Record<BasketKey, BasketCount>;

const EMPTY_COUNTS: BasketCount = { total: 0, new: 0, validating: 0, active: 0, closed: 0 };

const BASKETS: {
  key: BasketKey;
  label: string;
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  activeBorder: string;
  activeBg: string;
}[] = [
  {
    key: "email", label: "Email",
    Icon: MailIcon,
    iconBg: "bg-blue-100", iconColor: "text-blue-600",
    activeBorder: "border-blue-400", activeBg: "bg-blue-50/60",
  },
  {
    key: "website", label: "Website",
    Icon: GlobeIcon,
    iconBg: "bg-emerald-100", iconColor: "text-emerald-600",
    activeBorder: "border-emerald-400", activeBg: "bg-emerald-50/60",
  },
  {
    key: "internal", label: "Internal",
    Icon: Building2Icon,
    iconBg: "bg-violet-100", iconColor: "text-violet-600",
    activeBorder: "border-violet-400", activeBg: "bg-violet-50/60",
  },
  {
    key: "ai_search", label: "AI Search",
    Icon: BotIcon,
    iconBg: "bg-orange-100", iconColor: "text-orange-600",
    activeBorder: "border-orange-400", activeBg: "bg-orange-50/60",
  },
];

const BASKET_FILTERS: Record<BasketKey, { source?: string; channel?: string }> = {
  email:     { source: "email" },
  website:   { channel: "WEBSITE" },
  internal:  { source: "manual" },
  ai_search: { channel: "AI_SEARCH" },
};

// ── Status left-bar colour ────────────────────────────────────────────────────

function statusBarClass(jobStatus: string | null | undefined, legacyStatus: string | null | undefined) {
  if (jobStatus === "NEW")                return "bg-sky-400";
  if (jobStatus === "PENDING_VALIDATION") return "bg-amber-400";
  if (jobStatus === "OPEN")               return "bg-emerald-400";
  if (jobStatus === "CLOSED")             return "bg-gray-300 dark:bg-gray-600";
  // fallback to legacy status field
  if (legacyStatus === "pending_approval") return "bg-amber-400";
  if (legacyStatus === "searching")        return "bg-violet-400";
  if (legacyStatus === "active")           return "bg-emerald-400";
  if (legacyStatus === "closed")           return "bg-gray-300 dark:bg-gray-600";
  return "bg-transparent";
}

// ── Job row ───────────────────────────────────────────────────────────────────

function JobRow({ job, onToggle, onDelete }: {
  job: Job;
  onToggle: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isContract = (CONTRACT_TYPES as readonly string[]).includes(job.job_type ?? "");
  const salaryText = isContract
    ? formatSalary(job.pay_rate_min, job.pay_rate_max, job.currency, "/hr")
    : formatSalary(job.salary_min, job.salary_max, job.currency, "/yr");
  const displaySkills = job.required_skills?.length ? job.required_skills : job.skills ?? [];
  const jobStatus = job.job_status ?? (job.status === "active" ? "OPEN" : job.status === "closed" ? "CLOSED" : "NEW");
  const urgency = getUrgency(job.application_deadline);
  const daysLeft = urgencyDaysLeft(job.application_deadline);

  return (
    <div
      onClick={() => router.push(`/manager/jobs/${job.id}`)}
      className="flex rounded-xl border border-border bg-card hover:bg-accent transition-colors cursor-pointer overflow-hidden"
    >
      {/* Status colour bar */}
      <div className={`w-1 shrink-0 ${statusBarClass(job.job_status, job.status)}`} />

      {/* Content */}
      <div className="flex flex-1 items-center gap-4 p-4 min-w-0">
        {/* Icon */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <BriefcaseIcon className="size-5 text-primary" />
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground shrink-0">
              {formatJobId(job)}
            </span>
            {job.case_id && (
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold shrink-0">
                {job.case_id}
              </span>
            )}
            <span className="text-sm font-medium">{job.title}</span>
            <JobTypeBadge type={job.job_type} />
          </div>
          <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(job.company ?? job.end_client_name) && (
              <span>{job.company ?? job.end_client_name}</span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3" /> {job.location}
              </span>
            )}
            {job.work_mode && (
              <span className="flex items-center gap-1">
                <BriefcaseIcon className="size-3" /> {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
              </span>
            )}
            {salaryText && <span>{salaryText}</span>}
            <span className="flex items-center gap-1">
              <UsersIcon className="size-3" /> {job.openings ?? job.headcount ?? 1} opening{(job.openings ?? job.headcount ?? 1) !== 1 ? "s" : ""}
            </span>
          </div>
          {displaySkills.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {displaySkills.slice(0, 5).map((s) => (
                <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
              ))}
              {displaySkills.length > 5 && (
                <span className="text-[10px] text-muted-foreground">+{displaySkills.length - 5}</span>
              )}
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {urgency && urgency !== "low" && (
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${URGENCY_CLASS[urgency]}`}>
              {urgency === "high"
                ? `${daysLeft}d left · ${URGENCY_LABEL[urgency]}`
                : `${daysLeft}d · ${URGENCY_LABEL[urgency]}`}
            </span>
          )}
          <JobStatusBadge status={jobStatus} />
          <button
            onClick={(e) => onToggle(job.id, e)}
            title={job.is_active !== false ? "Active — click to deactivate" : "Inactive — click to activate"}
          >
            {job.is_active !== false
              ? <ToggleRightIcon className="size-5 text-emerald-600" />
              : <ToggleLeftIcon className="size-5 text-muted-foreground" />}
          </button>
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
            <Link href={`/manager/jobs/${job.id}/edit`}>
              <Button variant="ghost" size="icon" className="size-7">
                <PencilIcon className="size-3.5" />
              </Button>
            </Link>
            {confirmDelete ? (
              <>
                <Button
                  variant="destructive" size="sm" className="h-7 px-2 text-xs"
                  onClick={(e) => { e.stopPropagation(); onDelete(job.id, e); }}
                >
                  Delete
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-7 px-2 text-xs"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick-add dialog ──────────────────────────────────────────────────────────

interface Recruiter { id: string; name: string; email: string; }

interface QuickFormState {
  title: string; location: string; experience_min: string; experience_max: string;
  headcount: string; budget_min: string; budget_max: string; description: string;
  skills: string[]; skillInput: string; recruiter_id: string;
  submitted_by_name: string; submitted_by_email: string; submitted_by_phone: string;
  application_deadline: string; due_date: string;
}

const EMPTY_FORM: QuickFormState = {
  title: "", location: "", experience_min: "", experience_max: "",
  headcount: "1", budget_min: "", budget_max: "", description: "",
  skills: [], skillInput: "", recruiter_id: "",
  submitted_by_name: "", submitted_by_email: "", submitted_by_phone: "",
  application_deadline: "", due_date: "",
};

function QuickAddDialog({ open, onClose, onCreated, recruiters }: {
  open: boolean; onClose: () => void; onCreated: () => void; recruiters: Recruiter[];
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<QuickFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const skillInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill submitter from profile whenever dialog opens
  useEffect(() => {
    if (open && user) {
      setForm((f) => ({
        ...f,
        submitted_by_name:  f.submitted_by_name  || user.name  || "",
        submitted_by_email: f.submitted_by_email || user.email || "",
        submitted_by_phone: f.submitted_by_phone || user.phone || "",
      }));
    }
    if (!open) setForm(EMPTY_FORM);
  }, [open, user]);

  function set(field: keyof QuickFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addSkill() {
    const s = form.skillInput.trim();
    if (s && !form.skills.includes(s)) setForm((f) => ({ ...f, skills: [...f.skills, s], skillInput: "" }));
    else setForm((f) => ({ ...f, skillInput: "" }));
    skillInputRef.current?.focus();
  }

  function handleSkillKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addSkill(); }
  }

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(), skills: form.skills,
        headcount: Number(form.headcount) || 1, source: "manual", created_by: user?.id ?? null,
      };
      if (form.location.trim())    payload.location       = form.location.trim();
      if (form.experience_min)     payload.experience_min = Number(form.experience_min);
      if (form.experience_max)     payload.experience_max = Number(form.experience_max);
      if (form.budget_min)         payload.budget_min     = Number(form.budget_min);
      if (form.budget_max)         payload.budget_max     = Number(form.budget_max);
      if (form.description.trim())          payload.description          = form.description.trim();
      if (form.recruiter_id)               payload.recruiter_id          = form.recruiter_id;
      if (form.submitted_by_name.trim())   payload.submitted_by_name    = form.submitted_by_name.trim();
      if (form.submitted_by_email.trim())  payload.submitted_by_email   = form.submitted_by_email.trim();
      if (form.submitted_by_phone.trim())  payload.submitted_by_phone   = form.submitted_by_phone.trim();
      if (form.application_deadline)       payload.application_deadline = form.application_deadline;
      if (form.due_date)                   payload.due_date             = form.due_date;

      await apiFetch("/api/jobs/", { method: "POST", body: JSON.stringify(payload) });
      toast.success(`"${form.title}" created`);
      setForm(EMPTY_FORM);
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="text-sm">Quick Add Job</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <Label className="text-xs">Job Title <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. Backend Engineer" value={form.title} onChange={(e) => set("title", e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input placeholder="e.g. Bangalore" value={form.location} onChange={(e) => set("location", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Openings</Label>
              <Input type="number" min={1} value={form.headcount} onChange={(e) => set("headcount", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Exp Min (yrs)</Label>
              <Input type="number" min={0} placeholder="3" value={form.experience_min} onChange={(e) => set("experience_min", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Exp Max (yrs)</Label>
              <Input type="number" min={0} placeholder="8" value={form.experience_max} onChange={(e) => set("experience_max", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Budget Min (LPA)</Label>
              <Input type="number" min={0} placeholder="8" value={form.budget_min} onChange={(e) => set("budget_min", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Budget Max (LPA)</Label>
              <Input type="number" min={0} placeholder="15" value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Application Deadline</Label>
              <Input type="date" value={form.application_deadline} onChange={(e) => set("application_deadline", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date <span className="text-muted-foreground font-normal">(internal)</span></Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Required Skills</Label>
            <div className="flex gap-2">
              <Input
                ref={skillInputRef}
                placeholder="Type a skill and press Enter"
                value={form.skillInput}
                onChange={(e) => set("skillInput", e.target.value)}
                onKeyDown={handleSkillKey}
                className="h-8 text-sm"
              />
              <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={addSkill}>Add</Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {s}
                    <button onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))} className="text-muted-foreground hover:text-foreground">
                      <XIcon className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea placeholder="Job responsibilities…" value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("description", e.target.value)} className="min-h-20 text-sm resize-none" />
          </div>
          {/* Submitted By */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Submitted By</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={form.submitted_by_name} onChange={(e) => set("submitted_by_name", e.target.value)} placeholder="Full name" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.submitted_by_email} onChange={(e) => set("submitted_by_email", e.target.value)} placeholder="email@company.com" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mobile</Label>
                <Input value={form.submitted_by_phone} onChange={(e) => set("submitted_by_phone", e.target.value)} placeholder="+91 98765 43210" className="h-8 text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Assign to Recruiter <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Select value={form.recruiter_id} onValueChange={(v) => set("recruiter_id", v ?? "")}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select recruiter…" /></SelectTrigger>
              <SelectContent>
                {recruiters.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving}>{saving ? "Creating…" : "Create Job"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManagerJobsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeBasket, setActiveBasket] = useState<BasketKey | null>(null);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [basketCounts, setBasketCounts] = useState<BasketCounts>({
    email: { ...EMPTY_COUNTS },
    website: { ...EMPTY_COUNTS },
    internal: { ...EMPTY_COUNTS },
    ai_search: { ...EMPTY_COUNTS },
  });

  useEffect(() => {
    apiFetch<BasketCounts>("/api/jobs/basket-counts").then(setBasketCounts).catch(() => {});
    apiFetch<Recruiter[]>("/api/approvals/recruiters").then(setRecruiters).catch(() => {});
  }, []);

  const basketFilters = activeBasket ? BASKET_FILTERS[activeBasket] : {};

  const { items, total, loading, error, refetch } = useJobs({
    search: search || undefined,
    job_type: typeFilter || undefined,
    ...basketFilters,
    pending_only: activeBasket ? true : undefined,
    page,
  });

  function handleBasketClick(key: BasketKey) {
    setActiveBasket((prev) => prev === key ? null : key);
    setPage(1);
  }

  function refreshAll() {
    refetch();
    apiFetch<BasketCounts>("/api/jobs/basket-counts").then(setBasketCounts).catch(() => {});
  }

  const handleToggle = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await apiFetch(`/api/jobs/${id}/toggle`, { method: "PATCH" });
      refetch();
    } catch {
      toast.error("Failed to toggle job status");
    }
  }, [refetch]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await apiFetch(`/api/jobs/${id}`, { method: "DELETE" });
      toast.success("Job deleted");
      refreshAll();
    } catch {
      toast.error("Failed to delete job");
    }
  }, [refetch]);

  const totalPages = Math.ceil(total / 20);
  const activeBasketLabel = activeBasket ? BASKETS.find((b) => b.key === activeBasket)?.label : null;

  return (
    <>
      <Shell
        role="manager"
        pageTitle="Work Baskets"
        pageSubtitle={activeBasketLabel ? `${activeBasketLabel} · ${total} job${total !== 1 ? "s" : ""}` : `${total} job${total !== 1 ? "s" : ""} total`}
      >

        {/* ── Basket Cards ── */}
        <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
          {BASKETS.map(({ key, label, Icon, iconBg, iconColor, activeBorder, activeBg }) => {
            const counts = basketCounts[key];
            const isActive = activeBasket === key;
            return (
              <button
                key={key}
                onClick={() => handleBasketClick(key)}
                className={[
                  "rounded-xl border p-4 text-left transition-all hover:shadow-sm",
                  isActive
                    ? `${activeBorder} ${activeBg} shadow-sm`
                    : "border-border bg-card hover:bg-accent",
                ].join(" ")}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex size-8 items-center justify-center rounded-lg ${iconBg}`}>
                    <Icon className={`size-4 ${iconColor}`} />
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{counts.total}</span>
                </div>
                <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  {counts.new > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="size-1.5 rounded-full bg-sky-400 inline-block" />
                      {counts.new} new
                    </span>
                  )}
                  {counts.validating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="size-1.5 rounded-full bg-amber-400 inline-block" />
                      {counts.validating} validating
                    </span>
                  )}
                  {counts.active > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="size-1.5 rounded-full bg-emerald-400 inline-block" />
                      {counts.active} active
                    </span>
                  )}
                  {counts.closed > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="size-1.5 rounded-full bg-gray-300 inline-block" />
                      {counts.closed} closed
                    </span>
                  )}
                  {counts.total === 0 && <span className="italic">empty</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Work List header ── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">
              {activeBasketLabel ? `${activeBasketLabel} — Pending Action` : "All Jobs"}
            </h2>
            {activeBasket && (
              <button
                onClick={() => { setActiveBasket(null); setPage(1); }}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                <XIcon className="size-3" /> Show all
              </button>
            )}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="relative flex-1 min-w-48">
            <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search title, company, location…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <Select value={typeFilter || "all"} onValueChange={(v) => { setTypeFilter(v === "all" ? "" : (v ?? "")); setPage(1); }}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Permanent</div>
              {FULLTIME_TYPES.map((t) => <SelectItem key={t} value={t}>{JOB_TYPE_LABELS[t]}</SelectItem>)}
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground border-t mt-1 pt-2">Contract</div>
              {CONTRACT_TYPES.map((t) => <SelectItem key={t} value={t}>{JOB_TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs shrink-0" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-3.5" /> Quick Add
          </Button>
          <Link href="/manager/jobs/new">
            <Button size="sm" className="h-8 gap-1.5 shrink-0">
              <PlusIcon className="size-3.5" /> Post Job
            </Button>
          </Link>
        </div>

        {/* ── Job list ── */}
        <div className="space-y-2">
          {loading ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : error ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <InboxIcon className="size-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                {activeBasketLabel ? `No pending jobs in ${activeBasketLabel}` : "No jobs found"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {activeBasketLabel ? "All jobs from this channel have been processed and assigned" : "Try adjusting your filters or post a new job"}
              </p>
            </div>
          ) : (
            items.map((job) => (
              <JobRow key={job.id} job={job} onToggle={handleToggle} onDelete={handleDelete} />
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>Next</Button>
          </div>
        )}
      </Shell>

      <QuickAddDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refreshAll}
        recruiters={recruiters}
      />

      <Toaster position="top-right" richColors />
    </>
  );
}
