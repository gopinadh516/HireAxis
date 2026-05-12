"use client";

import { Shell } from "@/components/layout/shell";
import { AssignmentCard } from "@/components/recruiter/assignment-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useRecruiterDashboard } from "@/hooks/use-recruiter-dashboard";
import { BriefcaseIcon, SearchIcon, UsersIcon, CheckCircleIcon, InboxIcon } from "lucide-react";
import { toast } from "sonner";

export default function RecruiterDashboard() {
  const { assignments, pending, searching, completed, loading, startSearch } = useRecruiterDashboard();

  const stats = [
    { label: "Assigned Jobs",    value: assignments.length, icon: BriefcaseIcon,   color: "text-primary",      bg: "bg-primary/8" },
    { label: "Pending Review",   value: pending.length,     icon: BriefcaseIcon,   color: "text-amber-500",    bg: "bg-amber-50" },
    { label: "AI Searching",     value: searching.length,   icon: SearchIcon,      color: "text-blue-500",     bg: "bg-blue-50" },
    { label: "Completed",        value: completed.length,   icon: CheckCircleIcon, color: "text-emerald-500",  bg: "bg-emerald-50" },
  ];

  async function handleStartSearch(assignmentId: string) {
    try {
      await startSearch(assignmentId);
    } catch {
      toast.error("Failed to start search. Is the backend running?");
    }
  }

  return (
    <>
      <Shell role="recruiter" userName="Priya Nair" pageTitle="Dashboard" pageSubtitle="Your assigned jobs">
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

        {/* Pending — needs action */}
        {!loading && pending.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold">Action Needed</h2>
              <span className="flex size-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-semibold text-amber-700">
                {pending.length}
              </span>
            </div>
            <div className="space-y-3">
              {pending.map((a) => (
                <AssignmentCard key={a.id} assignment={a} onStartSearch={handleStartSearch} />
              ))}
            </div>
          </div>
        )}

        {/* Searching */}
        {!loading && searching.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold">Currently Searching</h2>
            <div className="space-y-3">
              {searching.map((a) => (
                <AssignmentCard key={a.id} assignment={a} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && assignments.length === 0 && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
            <InboxIcon className="size-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No jobs assigned yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Jobs will appear here once a manager approves and assigns them
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        )}
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
