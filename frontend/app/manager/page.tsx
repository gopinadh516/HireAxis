"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { JobCard } from "@/components/manager/job-card";
import { JobApprovalModal } from "@/components/manager/job-approval-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useManagerDashboard } from "@/hooks/use-manager-dashboard";
import { Toaster } from "@/components/ui/sonner";
import {
  BriefcaseIcon, ClockIcon, CheckCircleIcon,
  SearchIcon, InboxIcon,
} from "lucide-react";
import type { Job } from "@/lib/database.types";

export default function ManagerDashboard() {
  const { jobs, pending, active, searching, recruiters, loading, approveJob, rejectJob } =
    useManagerDashboard();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const stats = [
    { label: "Pending Approval", value: pending.length, icon: ClockIcon, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Active Jobs",      value: active.length,  icon: BriefcaseIcon, color: "text-primary",    bg: "bg-primary/8" },
    { label: "AI Searching",     value: searching.length, icon: SearchIcon, color: "text-blue-500",   bg: "bg-blue-50" },
    { label: "Total Jobs",       value: jobs.length,    icon: CheckCircleIcon, color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  return (
    <>
      <Shell role="manager" userName="Arjun Sharma" pageTitle="Dashboard" pageSubtitle="Overview of all hiring activity">
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

        {/* Pending approvals */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Pending Approval</h2>
              {pending.length > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-semibold text-amber-700">
                  {pending.length}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
              <InboxIcon className="size-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No pending approvals</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                New job requirements from emails will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((job) => (
                <JobCard key={job.id} job={job} onReview={setSelectedJob} />
              ))}
            </div>
          )}
        </div>

        {/* All recent jobs */}
        {!loading && jobs.filter((j) => j.status !== "pending_approval").length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold">Recent Jobs</h2>
            <div className="space-y-3">
              {jobs
                .filter((j) => j.status !== "pending_approval")
                .slice(0, 5)
                .map((job) => (
                  <JobCard key={job.id} job={job} onReview={setSelectedJob} />
                ))}
            </div>
          </div>
        )}
      </Shell>

      {/* Approval popup */}
      <JobApprovalModal
        job={selectedJob}
        recruiters={recruiters}
        open={!!selectedJob}
        onOpenChange={(open) => { if (!open) setSelectedJob(null); }}
        onApprove={approveJob}
        onReject={rejectJob}
      />

      <Toaster position="top-right" richColors />
    </>
  );
}
