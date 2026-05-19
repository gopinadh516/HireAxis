"use client";

import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { JobCard } from "@/components/manager/job-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useManagerDashboard } from "@/hooks/use-manager-dashboard";
import { Toaster } from "@/components/ui/sonner";
import {
  BriefcaseIcon, InboxIcon, SearchIcon, CheckCircleIcon, ClipboardCheckIcon,
} from "lucide-react";

export default function ManagerDashboard() {
  const { jobs, loading } = useManagerDashboard();

  const newJobs       = jobs.filter((j) => j.job_status === "NEW");
  const inProgress    = jobs.filter((j) => j.pipeline_stage && j.pipeline_stage !== "closed" && j.job_status !== "NEW");
  const searching     = jobs.filter((j) => j.pipeline_stage === "search");
  const closed        = jobs.filter((j) => j.pipeline_stage === "closed" || j.job_status === "CLOSED");

  const stats = [
    { label: "New Jobs",      value: newJobs.length,    icon: InboxIcon,          color: "text-sky-500",     bg: "bg-sky-50" },
    { label: "In Pipeline",   value: inProgress.length, icon: ClipboardCheckIcon, color: "text-primary",     bg: "bg-primary/8" },
    { label: "AI Searching",  value: searching.length,  icon: SearchIcon,         color: "text-blue-500",    bg: "bg-blue-50" },
    { label: "Total Jobs",    value: jobs.length,       icon: BriefcaseIcon,      color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  return (
    <>
      <Shell role="manager" pageTitle="Dashboard" pageSubtitle="Overview of all hiring activity">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <div className={`flex size-7 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`size-3.5 ${color}`} />
                </div>
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-12" />
              ) : (
                <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
              )}
            </div>
          ))}
        </div>

        {/* New jobs — need validation */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold">New Jobs</h2>
            {newJobs.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-700">
                {newJobs.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : newJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
              <InboxIcon className="size-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No new jobs</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Newly received jobs will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {newJobs.map((job) => (
                <JobCard key={job.id} job={job} onReview={() => {}} />
              ))}
            </div>
          )}
        </div>

        {/* Active pipeline jobs */}
        {!loading && inProgress.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold">Active Pipeline</h2>
            <div className="space-y-3">
              {inProgress.slice(0, 5).map((job) => (
                <JobCard key={job.id} job={job} onReview={() => {}} />
              ))}
            </div>
          </div>
        )}
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
