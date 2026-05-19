"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineBar } from "@/components/jobs/PipelineBar";
import { CaseAssignCard } from "@/components/jobs/CaseAssignCard";
import { JobTypeBadge } from "@/components/jobs/JobTypeBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeftIcon, ChevronRightIcon, CalendarIcon, UserIcon,
  CheckCircle2Icon, XCircleIcon, PauseCircleIcon, ClockIcon,
  MapPinIcon, BriefcaseIcon, UsersIcon,
} from "lucide-react";
import { formatJobId, WORK_MODE_LABELS } from "@/lib/constants";
import type { Job, Interview } from "@/lib/database.types";

interface Talent { id: string; name: string | null; first_name: string | null; last_name: string | null; current_title: string | null; current_company: string | null; }
interface JobTalent { id: string; talent_id: string; status: string; match_score: number | null; talents?: Talent; }

function talentName(t: Talent) {
  if (t.first_name || t.last_name) return `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim();
  return t.name ?? "Unknown";
}

const OUTCOME_CONFIG = {
  pass: { label: "Pass", icon: CheckCircle2Icon, class: "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" },
  fail: { label: "Fail", icon: XCircleIcon,     class: "text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/10" },
  hold: { label: "Hold", icon: PauseCircleIcon,  class: "text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100" },
} as const;

function InterviewCard({ jobId, jt, interview, onUpdated }: { jobId: string; jt: JobTalent; interview: Interview | undefined; onUpdated: () => void; }) {
  const t = jt.talents;
  const [date, setDate]           = useState(interview?.scheduled_at?.slice(0, 16) ?? "");
  const [duration, setDuration]   = useState(String(interview?.duration_minutes ?? 60));
  const [interviewers, setInterviewers] = useState((interview?.interviewer_names ?? []).join(", "));
  const [feedback, setFeedback]   = useState(interview?.feedback ?? "");
  const [saving, setSaving]       = useState(false);
  const [recording, setRecording] = useState(false);
  const outcomeVal = interview?.outcome ?? "pending";

  async function handleSchedule() {
    setSaving(true);
    try {
      const payload = { scheduled_at: date || null, duration_minutes: Number(duration), interviewer_names: interviewers.split(",").map((s) => s.trim()).filter(Boolean) };
      if (interview) {
        await apiFetch(`/api/jobs/${jobId}/interviews/${interview.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/jobs/${jobId}/interviews`, { method: "POST", body: JSON.stringify({ talent_id: jt.talent_id, type: "internal", ...payload }) });
      }
      toast.success("Interview scheduled"); onUpdated();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleOutcome(outcome: "pass" | "fail" | "hold") {
    if (!interview) { toast.error("Schedule first"); return; }
    setRecording(true);
    try {
      await apiFetch(`/api/jobs/${jobId}/interviews/${interview.id}`, { method: "PATCH", body: JSON.stringify({ outcome, feedback: feedback || null, status: "completed" }) });
      toast.success(`Outcome: ${outcome}`); onUpdated();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setRecording(false); }
  }

  return (
    <div className={`rounded-xl border bg-card p-5 space-y-4 ${outcomeVal !== "pending" ? "border-border opacity-80" : "border-primary/30"}`}>
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10"><UserIcon className="size-4 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{t ? talentName(t) : "Unknown"}</p>
          {t?.current_title && <p className="text-xs text-muted-foreground">{t.current_title}{t.current_company ? ` · ${t.current_company}` : ""}</p>}
        </div>
        {outcomeVal !== "pending" && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize
            ${outcomeVal === "pass" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : outcomeVal === "fail" ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            {outcomeVal}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1"><Label className="text-xs">Date & Time</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" /></div>
        <div className="space-y-1">
          <Label className="text-xs">Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{["30","45","60","90","120"].map((d) => <SelectItem key={d} value={d}>{d} min</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Interviewers <span className="text-muted-foreground">(comma-separated)</span></Label><Input value={interviewers} onChange={(e) => setInterviewers(e.target.value)} placeholder="Alice, Bob" className="h-8 text-xs" /></div>
      </div>
      <Button size="sm" variant="outline" onClick={handleSchedule} disabled={saving} className="h-7 text-xs gap-1.5">
        <CalendarIcon className="size-3.5" />{saving ? "Saving…" : (interview ? "Update Schedule" : "Schedule Interview")}
      </Button>

      {interview && outcomeVal === "pending" && (
        <div className="space-y-2 border-t border-border pt-4">
          <Label className="text-xs">Feedback (optional)</Label>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Notes…" className="min-h-16 text-xs resize-none" />
          <div className="flex gap-2">
            {(["pass","fail","hold"] as const).map((o) => {
              const cfg = OUTCOME_CONFIG[o];
              return <Button key={o} size="sm" variant="outline" className={`h-7 flex-1 text-xs gap-1 ${cfg.class}`} disabled={recording} onClick={() => handleOutcome(o)}><cfg.icon className="size-3.5" />{cfg.label}</Button>;
            })}
          </div>
        </div>
      )}
      {interview && outcomeVal !== "pending" && interview.feedback && (
        <p className="text-xs text-muted-foreground border-t border-border pt-3 italic">"{interview.feedback}"</p>
      )}
    </div>
  );
}

export default function InternalInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [jobTalents, setJobTalents] = useState<JobTalent[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const loadData = useCallback(async () => {
    const [j, jt, iv] = await Promise.all([
      apiFetch<Job>(`/api/jobs/${id}`),
      apiFetch<JobTalent[]>(`/api/jobs/${id}/job-talents?status=selected`),
      apiFetch<Interview[]>(`/api/jobs/${id}/interviews?type=internal`),
    ]);
    setJob(j); setJobTalents(jt); setInterviews(iv);
  }, [id]);

  useEffect(() => { loadData().catch(() => {}).finally(() => setLoading(false)); }, [loadData]);

  const allDone = jobTalents.length > 0 && jobTalents.every((jt) => {
    const iv = interviews.find((i) => i.talent_id === jt.talent_id);
    return iv && iv.outcome !== "pending";
  });

  async function handleAdvance() {
    setAdvancing(true);
    try {
      await apiFetch(`/api/jobs/${id}/pipeline-stage`, { method: "PATCH", body: JSON.stringify({ stage: "client_interview" }) });
      toast.success("Advanced to Client Interview");
      router.push(`/manager/jobs/${id}/client-interview`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Cannot advance yet"); }
    finally { setAdvancing(false); }
  }

  if (loading) return <Shell role="manager" pageTitle="Internal Interview"><div className="space-y-4">{[1,2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div></Shell>;
  if (!job) return <Shell role="manager" pageTitle="Not Found"><p className="text-sm text-muted-foreground">Job not found.</p></Shell>;

  return (
    <>
      <Shell role="manager" pageTitle={job.title} pageSubtitle={formatJobId(job)}>
        <div className="mb-4">
          <Link href={`/manager/jobs/${id}/finalize`}>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs -ml-2"><ArrowLeftIcon className="size-3.5" /> Back to Finalize</Button>
          </Link>
        </div>

        <PipelineBar jobId={id} currentStage={job.pipeline_stage ?? "internal_interview"} />

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Left: job info + assign ── */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <JobTypeBadge type={job.job_type} />
                {job.case_id && <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">{job.case_id}</span>}
              </div>
              <h2 className="text-sm font-semibold">{job.title}</h2>
              <dl className="space-y-1.5 text-xs text-muted-foreground">
                {job.location && <div className="flex items-center gap-1.5"><MapPinIcon className="size-3" />{job.location}</div>}
                {job.work_mode && <div className="flex items-center gap-1.5"><BriefcaseIcon className="size-3" />{WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}</div>}
                <div className="flex items-center gap-1.5"><UsersIcon className="size-3" />{job.openings ?? job.headcount ?? 1} opening{(job.openings ?? job.headcount ?? 1) !== 1 ? "s" : ""}</div>
              </dl>
              {job.description && <p className="text-xs text-muted-foreground line-clamp-4 border-t border-border pt-2">{job.description}</p>}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><ClockIcon className="size-3.5" /> Progress</p>
              <p className="text-xs text-muted-foreground">{interviews.filter((i) => i.outcome !== "pending").length} of {jobTalents.length} interviews completed</p>
            </div>

            <CaseAssignCard jobId={id} onAssigned={loadData} />
          </div>

          {/* ── Right: interview working area ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Internal Interviews</h2>
              <p className="text-xs text-muted-foreground">Schedule and record outcomes per candidate</p>
            </div>

            {jobTalents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <p className="text-sm text-muted-foreground">No candidates selected. Go back to Finalize.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobTalents.map((jt) => (
                  <InterviewCard key={jt.id} jobId={id} jt={jt} interview={interviews.find((i) => i.talent_id === jt.talent_id)} onUpdated={loadData} />
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleAdvance} disabled={advancing || !allDone} className="gap-1.5">
                {advancing ? "Checking…" : "Advance to Client Interview"}<ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
