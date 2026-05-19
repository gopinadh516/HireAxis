"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineBar } from "@/components/jobs/PipelineBar";
import { CaseAssignCard } from "@/components/jobs/CaseAssignCard";
import { JobTypeBadge } from "@/components/jobs/JobTypeBadge";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeftIcon, ChevronRightIcon, CheckCircle2Icon, XCircleIcon,
  UserIcon, StarIcon, MapPinIcon, BriefcaseIcon, UsersIcon,
} from "lucide-react";
import { formatJobId, WORK_MODE_LABELS } from "@/lib/constants";
import type { Job } from "@/lib/database.types";

interface Talent {
  id: string; name: string | null; first_name: string | null; last_name: string | null;
  current_title: string | null; current_company: string | null;
  total_experience: number | null; experience_years: number | null;
  visa_status: string | null; skills: string[];
}
interface JobTalent { id: string; talent_id: string; status: string; match_score: number | null; talents?: Talent; }

function talentName(t: Talent) {
  if (t.first_name || t.last_name) return `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim();
  return t.name ?? "Unknown";
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color = score >= 70 ? "bg-emerald-100 text-emerald-700" : score >= 40 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600";
  return <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}><StarIcon className="size-2.5" />{score}</span>;
}

export default function FinalizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [jobTalents, setJobTalents] = useState<JobTalent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const loadData = useCallback(async () => {
    const [j, jt] = await Promise.all([
      apiFetch<Job>(`/api/jobs/${id}`),
      apiFetch<JobTalent[]>(`/api/jobs/${id}/job-talents`),
    ]);
    setJob(j); setJobTalents(jt);
  }, [id]);

  useEffect(() => { loadData().catch(() => {}).finally(() => setLoading(false)); }, [loadData]);

  const shortlisted = jobTalents.filter((jt) => jt.status === "shortlisted");
  const selected    = jobTalents.filter((jt) => jt.status === "selected");
  const rejected    = jobTalents.filter((jt) => jt.status === "rejected");

  async function setStatus(jtId: string, status: "selected" | "rejected") {
    setActionLoading(jtId);
    try {
      await apiFetch(`/api/jobs/${id}/job-talents/${jtId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setJobTalents((prev) => prev.map((jt) => jt.id === jtId ? { ...jt, status } : jt));
      toast.success(status === "selected" ? "Candidate selected for interview" : "Candidate rejected");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to update"); }
    finally { setActionLoading(null); }
  }

  async function handleAdvance() {
    setAdvancing(true);
    try {
      await apiFetch(`/api/jobs/${id}/pipeline-stage`, { method: "PATCH", body: JSON.stringify({ stage: "internal_interview" }) });
      toast.success("Advanced to Internal Interview");
      router.push(`/manager/jobs/${id}/internal-interview`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Cannot advance yet"); }
    finally { setAdvancing(false); }
  }

  if (loading) return <Shell role="manager" pageTitle="Finalize Candidate"><div className="space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div></Shell>;
  if (!job) return <Shell role="manager" pageTitle="Not Found"><p className="text-sm text-muted-foreground">Job not found.</p></Shell>;

  function CandidateRow({ jt, actions }: { jt: JobTalent; actions?: boolean }) {
    const t = jt.talents;
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <UserIcon className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{t ? talentName(t) : "Unknown"}</p>
            <ScoreBadge score={jt.match_score} />
          </div>
          {t?.current_title && <p className="text-xs text-muted-foreground">{t.current_title}{t.current_company ? ` · ${t.current_company}` : ""}</p>}
          {t?.skills && t.skills.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {t.skills.slice(0, 4).map((s) => <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>)}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" disabled={actionLoading === jt.id} onClick={() => setStatus(jt.id, "selected")}>
              <CheckCircle2Icon className="size-3.5" /> Select
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" disabled={actionLoading === jt.id} onClick={() => setStatus(jt.id, "rejected")}>
              <XCircleIcon className="size-3.5" /> Reject
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Shell role="manager" pageTitle={job.title} pageSubtitle={formatJobId(job)}>
        <div className="mb-4">
          <Link href={`/manager/jobs/${id}/search`}>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs -ml-2">
              <ArrowLeftIcon className="size-3.5" /> Back to Search
            </Button>
          </Link>
        </div>

        <PipelineBar jobId={id} currentStage={job.pipeline_stage ?? "finalize"} />

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Left: job info + adhoc actions ── */}
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
              {(job.required_skills?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {(job.required_skills ?? []).slice(0, 6).map((s) => <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>)}
                </div>
              )}
              {job.description && <p className="text-xs text-muted-foreground line-clamp-4 border-t border-border pt-2">{job.description}</p>}
            </div>

            <CaseAssignCard jobId={id} onAssigned={loadData} />
          </div>

          {/* ── Right: working area ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Shortlisted */}
            <section>
              <h2 className="mb-3 text-sm font-semibold">Shortlisted <span className="text-muted-foreground font-normal">({shortlisted.length})</span></h2>
              {shortlisted.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-10 text-center">
                  <p className="text-sm text-muted-foreground">No shortlisted candidates. Go to Search to shortlist candidates.</p>
                </div>
              ) : (
                <div className="space-y-2">{shortlisted.map((jt) => <CandidateRow key={jt.id} jt={jt} actions />)}</div>
              )}
            </section>

            {/* Selected */}
            {selected.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-emerald-700">Selected for Interview <span className="text-muted-foreground font-normal">({selected.length})</span></h2>
                <div className="space-y-2">
                  {selected.map((jt) => (
                    <div key={jt.id} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <CheckCircle2Icon className="size-5 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{jt.talents ? talentName(jt.talents) : "Unknown"}</p>
                        {jt.talents?.current_title && <p className="text-xs text-emerald-700">{jt.talents.current_title}</p>}
                      </div>
                      <ScoreBadge score={jt.match_score} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Rejected */}
            {rejected.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Rejected ({rejected.length})</h2>
                <div className="space-y-2 opacity-60">{rejected.map((jt) => <CandidateRow key={jt.id} jt={jt} />)}</div>
              </section>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleAdvance} disabled={advancing || selected.length === 0} className="gap-1.5">
                {advancing ? "Checking…" : `Advance to Internal Interview (${selected.length} selected)`}
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
