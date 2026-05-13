"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Shell } from "@/components/layout/shell";
import { JobCard } from "@/components/manager/job-card";
import { JobApprovalModal } from "@/components/manager/job-approval-modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useManagerDashboard, MANAGER_ID } from "@/hooks/use-manager-dashboard";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { InboxIcon, PlusIcon, XIcon } from "lucide-react";
import type { Job, JobStatus } from "@/lib/database.types";

const TABS: { value: "all" | JobStatus; label: string }[] = [
  { value: "all",              label: "All" },
  { value: "pending_approval", label: "Pending" },
  { value: "active",           label: "Active" },
  { value: "searching",        label: "Searching" },
  { value: "closed",           label: "Closed" },
];

// ── Create Job Dialog ─────────────────────────────────────────────────────────

interface JobFormState {
  title: string;
  location: string;
  experience_min: string;
  experience_max: string;
  headcount: string;
  budget_min: string;
  budget_max: string;
  description: string;
  skills: string[];
  skillInput: string;
  recruiter_id: string;
}

const EMPTY_FORM: JobFormState = {
  title: "",
  location: "",
  experience_min: "",
  experience_max: "",
  headcount: "1",
  budget_min: "",
  budget_max: "",
  description: "",
  skills: [],
  skillInput: "",
  recruiter_id: "",
};

interface Recruiter { id: string; name: string; email: string; }

function CreateJobDialog({ open, onClose, onCreated, recruiters }: { open: boolean; onClose: () => void; onCreated: () => void; recruiters: Recruiter[] }) {
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const skillInputRef = useRef<HTMLInputElement>(null);

  function set(field: keyof JobFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addSkill() {
    const skill = form.skillInput.trim();
    if (!skill || form.skills.includes(skill)) { set("skillInput", ""); return; }
    setForm((f) => ({ ...f, skills: [...f.skills, skill], skillInput: "" }));
  }

  function removeSkill(s: string) {
    setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }));
  }

  function handleSkillKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(); }
  }

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error("Job title is required"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        skills: form.skills,
        headcount: Number(form.headcount) || 1,
        source: "manual",
        created_by: MANAGER_ID,
      };
      if (form.location.trim())    payload.location       = form.location.trim();
      if (form.experience_min)     payload.experience_min = Number(form.experience_min);
      if (form.experience_max)     payload.experience_max = Number(form.experience_max);
      if (form.budget_min)         payload.budget_min     = Number(form.budget_min);
      if (form.budget_max)         payload.budget_max     = Number(form.budget_max);
      if (form.description.trim()) payload.description    = form.description.trim();
      if (form.recruiter_id)       payload.recruiter_id   = form.recruiter_id;

      await apiFetch("/jobs/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(`"${form.title}" added to approval queue`);
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">New Job Requirement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pb-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs">Job Title <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Senior React Developer"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Location + Headcount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input
                placeholder="e.g. Bangalore / Remote"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Headcount</Label>
              <Input
                type="number"
                min={1}
                placeholder="1"
                value={form.headcount}
                onChange={(e) => set("headcount", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Experience */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Experience Min (yrs)</Label>
              <Input
                type="number"
                min={0}
                placeholder="2"
                value={form.experience_min}
                onChange={(e) => set("experience_min", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Experience Max (yrs)</Label>
              <Input
                type="number"
                min={0}
                placeholder="6"
                value={form.experience_max}
                onChange={(e) => set("experience_max", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Budget Min (LPA)</Label>
              <Input
                type="number"
                min={0}
                placeholder="8"
                value={form.budget_min}
                onChange={(e) => set("budget_min", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Budget Max (LPA)</Label>
              <Input
                type="number"
                min={0}
                placeholder="15"
                value={form.budget_max}
                onChange={(e) => set("budget_max", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-1.5">
            <Label className="text-xs">Required Skills</Label>
            <div className="flex gap-2">
              <Input
                ref={skillInputRef}
                placeholder="Type a skill and press Enter"
                value={form.skillInput}
                onChange={(e) => set("skillInput", e.target.value)}
                onKeyDown={handleSkillKeyDown}
                className="h-8 text-sm"
              />
              <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={addSkill}>
                Add
              </Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {s}
                    <button onClick={() => removeSkill(s)} className="text-muted-foreground hover:text-foreground">
                      <XIcon className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              placeholder="Job responsibilities, requirements, or any additional context…"
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("description", e.target.value)}
              className="min-h-20 text-sm resize-none"
            />
          </div>

          {/* Assign Recruiter */}
          <div className="space-y-1.5">
            <Label className="text-xs">Assign to Recruiter <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Select value={form.recruiter_id} onValueChange={(v) => set("recruiter_id", v ?? "")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select recruiter…" />
              </SelectTrigger>
              <SelectContent>
                {recruiters.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Job will be created as <strong>Active</strong> immediately — no approval needed.
            {form.recruiter_id ? " The selected recruiter will be notified." : " You can assign a recruiter later from the Jobs list."}
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? "Creating…" : "Create Job"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManagerJobsPage() {
  const { jobs, recruiters, loading, approveJob, rejectJob, fetchJobs } = useManagerDashboard();
  const [tab, setTab] = useState<"all" | JobStatus>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = tab === "all" ? jobs : jobs.filter((j) => j.status === tab);

  return (
    <>
      <Shell role="manager" userName="Arjun Sharma" pageTitle="Jobs" pageSubtitle="All job requirements">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | JobStatus)}>
            <TabsList className="h-8 gap-0.5 bg-muted p-0.5">
              {TABS.map(({ value, label }) => {
                const count = value === "all" ? jobs.length : jobs.filter((j) => j.status === value).length;
                return (
                  <TabsTrigger key={value} value={value} className="h-7 px-3 text-xs gap-1.5">
                    {label}
                    {count > 0 && (
                      <span className="rounded-full bg-muted-foreground/15 px-1.5 py-px text-[10px] font-medium">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-3.5" /> Add Job
          </Button>
        </div>

        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <InboxIcon className="size-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No jobs found</p>
            </div>
          ) : (
            filtered.map((job) => (
              <JobCard key={job.id} job={job} onReview={setSelectedJob} />
            ))
          )}
        </div>
      </Shell>

      <JobApprovalModal
        job={selectedJob}
        recruiters={recruiters}
        open={!!selectedJob}
        onOpenChange={(open) => { if (!open) setSelectedJob(null); }}
        onApprove={approveJob}
        onReject={rejectJob}
      />

      <CreateJobDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchJobs}
        recruiters={recruiters}
      />

      <Toaster position="top-right" richColors />
    </>
  );
}
