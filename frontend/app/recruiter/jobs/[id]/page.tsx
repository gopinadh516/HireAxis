"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { CandidateCard } from "@/components/recruiter/candidate-card";
import { SkillTagList } from "@/components/ui/skill-tag";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useJobCandidates, useRecruiterDashboard } from "@/hooks/use-recruiter-dashboard";
import { toast } from "sonner";
import {
  ArrowLeftIcon, SearchIcon, MapPinIcon,
  BriefcaseIcon, UsersIcon, IndianRupeeIcon, MailIcon,
} from "lucide-react";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assignmentId");

  const { assignments, startSearch } = useRecruiterDashboard();
  const { candidates, loading: candidatesLoading, refetch } = useJobCandidates(jobId);

  const assignment = assignments.find((a) => a.id === assignmentId || a.job_id === jobId);
  const job = assignment?.jobs;

  const [starting, setStarting] = useState(false);

  async function handleStartSearch() {
    if (!assignment) return;
    setStarting(true);
    try {
      await startSearch(assignment.id);
    } catch {
      toast.error("Failed to start search. Is the backend running?");
    } finally {
      setStarting(false);
    }
  }

  const isSearching  = assignment?.status === "searching";
  const isPending    = assignment?.status === "pending";
  const isCompleted  = assignment?.status === "completed";

  return (
    <>
      <Shell role="recruiter" userName="Priya Nair" pageTitle={job?.title ?? "Job Detail"}>
        {/* Back */}
        <Link href="/recruiter/jobs">
          <Button variant="ghost" size="sm" className="mb-4 h-8 gap-1.5 text-xs -ml-1">
            <ArrowLeftIcon className="size-3.5" /> Back to Jobs
          </Button>
        </Link>

        {!job ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: Job details */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <h2 className="text-sm font-semibold">{job.title}</h2>
                  {assignment && <StatusBadge status={assignment.status} />}
                </div>

                {/* Details */}
                <div className="space-y-3">
                  {job.location && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPinIcon className="size-3.5 shrink-0" />
                      <span>{job.location}</span>
                    </div>
                  )}
                  {(job.experience_min !== null || job.experience_max !== null) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BriefcaseIcon className="size-3.5 shrink-0" />
                      <span>{job.experience_min ?? 0}–{job.experience_max ?? "?"} years experience</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UsersIcon className="size-3.5 shrink-0" />
                    <span>{job.headcount} position{job.headcount > 1 ? "s" : ""}</span>
                  </div>
                  {(job.budget_min || job.budget_max) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <IndianRupeeIcon className="size-3.5 shrink-0" />
                      <span>{job.budget_min ?? "?"} – {job.budget_max ?? "?"} LPA</span>
                    </div>
                  )}
                  {job.source === "email" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MailIcon className="size-3.5 shrink-0" />
                      <span>Sourced from email</span>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {job.skills.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Required Skills</p>
                    <SkillTagList skills={job.skills} max={12} />
                  </div>
                )}

                {/* Description */}
                {job.description && (
                  <div className="mt-4">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Description</p>
                    <p className="text-xs text-foreground leading-relaxed">{job.description}</p>
                  </div>
                )}
              </div>

              {/* Start Search CTA */}
              {isPending && (
                <Button
                  className="w-full gap-2"
                  onClick={handleStartSearch}
                  disabled={starting}
                >
                  <SearchIcon className="size-4" />
                  {starting ? "Starting Search..." : "Start AI Search"}
                </Button>
              )}

              {isSearching && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                  <div className="flex justify-center gap-1.5 mb-2">
                    <span className="size-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0ms]" />
                    <span className="size-2 rounded-full bg-blue-500 animate-bounce [animation-delay:150ms]" />
                    <span className="size-2 rounded-full bg-blue-500 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <p className="text-xs font-medium text-blue-700">AI Searching...</p>
                  <p className="text-[11px] text-blue-500 mt-0.5">Scanning Naukri & LinkedIn</p>
                </div>
              )}

              {isCompleted && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="text-xs font-medium text-emerald-700">Search Complete</p>
                  <p className="text-[11px] text-emerald-500 mt-0.5">{candidates.length} candidates found</p>
                </div>
              )}
            </div>

            {/* Right: Candidates */}
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Candidates
                  {candidates.length > 0 && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                      {candidates.length}
                    </span>
                  )}
                </h2>
              </div>

              {candidatesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
                </div>
              ) : candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
                  <SearchIcon className="size-8 text-muted-foreground/30" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    {isPending ? "Click 'Start AI Search' to find candidates" : "No candidates yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {isSearching ? "Results will appear here in real-time" : "Candidates from Naukri & LinkedIn will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((c) => (
                    <CandidateCard key={c.id} item={c} onStatusChange={refetch} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
