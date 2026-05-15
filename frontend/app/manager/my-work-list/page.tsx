"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkListCard } from "@/components/work-list/WorkListCard";
import { useMyWorkList } from "@/hooks/use-my-work-list";
import { InboxIcon } from "lucide-react";
import type { AssignmentStatus } from "@/lib/database.types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS: { value: "all" | AssignmentStatus; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "pending",   label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "searching", label: "Searching" },
  { value: "completed", label: "Completed" },
];

export default function ManagerMyWorkListPage() {
  const { assignments, loading } = useMyWorkList();
  const [tab, setTab] = useState<"all" | AssignmentStatus>("all");

  const filtered = tab === "all" ? assignments : assignments.filter((a) => a.status === tab);

  return (
    <>
      <Shell role="manager" pageTitle="My Work List" pageSubtitle="Cases assigned to you">
        <div className="mb-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | AssignmentStatus)}>
            <TabsList className="h-8 gap-0.5 bg-muted p-0.5">
              {TABS.map(({ value, label }) => {
                const count = value === "all"
                  ? assignments.length
                  : assignments.filter((a) => a.status === value).length;
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
        </div>

        <div className="space-y-2">
          {loading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <InboxIcon className="size-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No cases assigned to you</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Cases you self-assign will appear here</p>
            </div>
          ) : (
            filtered.map((a) => (
              <WorkListCard key={a.id} assignment={a} role="manager" />
            ))
          )}
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
