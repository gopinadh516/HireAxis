"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineBar } from "@/components/jobs/PipelineBar";
import { CandidateSourcingPanel } from "@/components/jobs/CandidateSourcingPanel";
import { CaseAssignCard } from "@/components/jobs/CaseAssignCard";
import { JobTypeBadge } from "@/components/jobs/JobTypeBadge";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeftIcon, MapPinIcon, BriefcaseIcon, UsersIcon,
  UserIcon, ChevronRightIcon, ClockIcon,
} from "lucide-react";
import { formatJobId, WORK_MODE_LABELS } from "@/lib/constants";
import type { Job } from "@/lib/database.types";

interface Assignment {
  id: string;
  status: string;
  users: { id: string; name: string; email: string } | null;
}

interface JobTalent {
  id: string;
  talent_id: string;
  status: string;
}

export default function SearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [talents, setTalents] = useState<JobTalent[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Job>(`/api/jobs/${id}`),
      apiFetch<Assignment[]>(`/api/jobs/${id}/assignments`),
    ])
      .then(([j, a]) => { setJob(j); setAssignments(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function refreshTalents() {
    try {
      const res = await apiFetch<{ items: JobTalent[] }>(`/api/jobs/${id}/pool-matches`);
      setTalents(Array.isArray(res) ? res : []);
    } catch { /* sourcing panel manages its own state */ }
  }

  async function handleAdvance() {
    setAdvancing(true);
    try {
      await apiFetch(`/api/jobs/${id}/pipeline-stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage: "finalize" }),
      });
      toast.success("Advanced to Finalize stage");
      router.push(`/manager/jobs/${id}/finalize`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cannot advance yet");
    } finally {
      setAdvancing(false);
    }
  }

  if (loading) {
    return (
      <Shell role="manager" pageTitle="Candidate Search">
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      </Shell>
    );
  }

  if (!job) {
    return (
      <Shell role="manager" pageTitle="Job Not Found">
        <p className="text-sm text-muted-foreground">This job could not be loaded.</p>
      </Shell>
    );
  }

  const recruiterAssignment = assignments.find((a) => a.status !== "reviewing");

  return (
    <>
      <Shell role="manager" pageTitle={job.title} pageSubtitle={formatJobId(job)}>
        <div className="mb-4 flex items-center gap-2">
          <Link href={`/manager/jobs/${id}`}>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs -ml-2">
              <ArrowLeftIcon className="size-3.5" /> Back to Validate
            </Button>
          </Link>
        </div>

        {/* Pipeline progress */}
        <PipelineBar jobId={id} currentStage={job.pipeline_stage ?? "search"} />

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Left: job summary + recruiter ── */}
          <div className="space-y-4">
            {/* Job summary */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <JobTypeBadge type={job.job_type} />
                {job.case_id && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                    {job.case_id}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-semibold">{job.title}</h2>
              <dl className="space-y-1.5 text-xs text-muted-foreground">
                {job.location && (
                  <div className="flex items-center gap-1.5"><MapPinIcon className="size-3" />{job.location}</div>
                )}
                {job.work_mode && (
                  <div className="flex items-center gap-1.5"><BriefcaseIcon className="size-3" />{WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}</div>
                )}
                <div className="flex items-center gap-1.5">
                  <UsersIcon className="size-3" />{job.openings ?? job.headcount ?? 1} opening{(job.openings ?? job.headcount ?? 1) !== 1 ? "s" : ""}
                </div>
              </dl>
              {(job.required_skills?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {(job.required_skills ?? []).slice(0, 6).map((s) => (
                    <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned recruiter */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserIcon className="size-3.5" /> Assigned Recruiter
              </p>
              {recruiterAssignment ? (
                <div>
                  <p className="text-sm font-medium">{recruiterAssignment.users?.name ?? "—"}</p>
                  {recruiterAssignment.users?.email && (
                    <p className="text-xs text-muted-foreground">{recruiterAssignment.users.email}</p>
                  )}
                  <span className="mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border-amber-200 capitalize">
                    {recruiterAssignment.status}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No recruiter assigned yet.</p>
              )}
            </div>

            {/* Stage info */}
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-sky-700 flex items-center gap-1.5">
                <ClockIcon className="size-3.5" /> Stage 2 of 6 — Candidate Search
              </p>
              <p className="text-xs text-sky-600">
                The assigned recruiter is sourcing candidates. Shortlist at least one candidate to advance to the Finalize stage.
              </p>
            </div>

            {/* Adhoc: assign case */}
            <CaseAssignCard jobId={id} />

            {/* Advance button */}
            <Button
              className="w-full gap-1.5"
              onClick={handleAdvance}
              disabled={advancing}
            >
              {advancing ? "Checking…" : "Advance to Finalize"}
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>

          {/* ── Right: sourcing panel ── */}
          <div className="lg:col-span-2">
            <CandidateSourcingPanel jobId={id} role="manager" />
          </div>
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
