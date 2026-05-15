"use client";

import Link from "next/link";
import {
  MapPinIcon, BriefcaseIcon, UsersIcon, ClockIcon,
  ArrowRightIcon, FolderOpenIcon, BuildingIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobTypeBadge } from "@/components/jobs/JobTypeBadge";
import type { AssignmentWithJob } from "@/hooks/use-my-work-list";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 border-amber-200",
  reviewing: "bg-blue-100 text-blue-700 border-blue-200",
  searching: "bg-violet-100 text-violet-700 border-violet-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_BAR: Record<string, string> = {
  pending:   "bg-amber-400",
  reviewing: "bg-blue-400",
  searching: "bg-violet-400",
  completed: "bg-emerald-400",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface WorkListCardProps {
  assignment: AssignmentWithJob;
  role: "manager" | "recruiter";
}

export function WorkListCard({ assignment, role }: WorkListCardProps) {
  const job = assignment.jobs;
  const href = role === "manager"
    ? `/manager/jobs/${job.id}`
    : `/recruiter/jobs/${job.id}?assignmentId=${assignment.id}`;

  return (
    <div className="flex rounded-xl border border-border bg-card overflow-hidden hover:bg-accent transition-colors">
      {/* Status bar */}
      <div className={`w-1 shrink-0 ${STATUS_BAR[assignment.status] ?? "bg-transparent"}`} />

      <div className="flex flex-1 items-center gap-4 p-4 min-w-0">
        {/* Icon */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <FolderOpenIcon className="size-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {job.case_id && (
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold shrink-0">
                {job.case_id}
              </span>
            )}
            <span className="text-sm font-medium truncate">{job.title}</span>
            <JobTypeBadge type={job.job_type} />
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[assignment.status] ?? "bg-muted text-muted-foreground border-border"}`}>
              {assignment.status}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(job.company ?? job.end_client_name) && (
              <span className="flex items-center gap-1">
                <BuildingIcon className="size-3" />
                {job.company ?? job.end_client_name}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3" /> {job.location}
              </span>
            )}
            {(job.experience_min != null || job.experience_max != null) && (
              <span className="flex items-center gap-1">
                <BriefcaseIcon className="size-3" />
                {job.experience_min ?? 0}–{job.experience_max ?? "?"} yrs
              </span>
            )}
            {(job.openings ?? job.headcount) && (
              <span className="flex items-center gap-1">
                <UsersIcon className="size-3" />
                {job.openings ?? job.headcount} position{(job.openings ?? job.headcount) !== 1 ? "s" : ""}
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto">
              <ClockIcon className="size-3" /> Assigned {timeAgo(assignment.created_at)}
            </span>
          </div>

          {assignment.status === "searching" && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="size-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-xs text-violet-600 font-medium">AI search in progress…</span>
            </div>
          )}
        </div>

        {/* Action */}
        <Link href={href} className="shrink-0">
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5">
            Open <ArrowRightIcon className="size-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
