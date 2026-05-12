"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { JobCard } from "@/components/manager/job-card";
import { JobApprovalModal } from "@/components/manager/job-approval-modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useManagerDashboard } from "@/hooks/use-manager-dashboard";
import { InboxIcon } from "lucide-react";
import type { Job, JobStatus } from "@/lib/database.types";

const TABS: { value: "all" | JobStatus; label: string }[] = [
  { value: "all",              label: "All" },
  { value: "pending_approval", label: "Pending" },
  { value: "active",           label: "Active" },
  { value: "searching",        label: "Searching" },
  { value: "closed",           label: "Closed" },
];

export default function ManagerJobsPage() {
  const { jobs, recruiters, loading, approveJob, rejectJob } = useManagerDashboard();
  const [tab, setTab] = useState<"all" | JobStatus>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const filtered = tab === "all" ? jobs : jobs.filter((j) => j.status === tab);

  return (
    <>
      <Shell role="manager" userName="Arjun Sharma" pageTitle="Jobs" pageSubtitle="All job requirements">
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

        <div className="mt-4 space-y-3">
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

      <Toaster position="top-right" richColors />
    </>
  );
}
