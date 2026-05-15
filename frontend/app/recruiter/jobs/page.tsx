"use client";

import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { AssignmentCard } from "@/components/recruiter/assignment-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { useRecruiterDashboard } from "@/hooks/use-recruiter-dashboard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InboxIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { AssignmentStatus } from "@/lib/database.types";

const TABS: { value: "all" | AssignmentStatus; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "pending",   label: "Pending" },
  { value: "searching", label: "Searching" },
  { value: "completed", label: "Completed" },
];

export default function RecruiterJobsPage() {
  const { assignments, loading, startSearch } = useRecruiterDashboard();
  const [tab, setTab] = useState<"all" | AssignmentStatus>("all");

  const filtered = tab === "all" ? assignments : assignments.filter((a) => a.status === tab);

  async function handleStartSearch(assignmentId: string) {
    try {
      await startSearch(assignmentId);
    } catch {
      toast.error("Failed to start search. Is the backend running?");
    }
  }

  return (
    <>
      <Shell role="recruiter" pageTitle="My Jobs" pageSubtitle="All assigned job requirements">
        <div className="mb-4 flex items-center justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | AssignmentStatus)}>
            <TabsList className="h-8 gap-0.5 bg-muted p-0.5">
              {TABS.map(({ value, label }) => {
                const count = value === "all" ? assignments.length : assignments.filter((a) => a.status === value).length;
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
          <Link href="/recruiter/jobs/new">
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              <PlusIcon className="size-3.5" /> Post Job
            </Button>
          </Link>
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
            filtered.map((a) => (
              <AssignmentCard key={a.id} assignment={a} onStartSearch={handleStartSearch} />
            ))
          )}
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
