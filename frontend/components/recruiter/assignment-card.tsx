"use client";

import Link from "next/link";
import { MapPinIcon, UsersIcon, BriefcaseIcon, ClockIcon, ArrowRightIcon, SearchIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkillTagList } from "@/components/ui/skill-tag";
import type { AssignmentWithJob } from "@/hooks/use-recruiter-dashboard";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface AssignmentCardProps {
  assignment: AssignmentWithJob;
  onStartSearch?: (assignmentId: string) => void;
}

export function AssignmentCard({ assignment, onStartSearch }: AssignmentCardProps) {
  const job = assignment.jobs;
  const isPending   = assignment.status === "pending";
  const isSearching = assignment.status === "searching";

  return (
    <Card className={`p-5 card-hover ${isSearching ? "border-blue-200 bg-blue-50/20" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground truncate">{job.title}</h3>
            <StatusBadge status={assignment.status} />
          </div>

          {/* Meta */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3" /> {job.location}
              </span>
            )}
            {(job.experience_min !== null || job.experience_max !== null) && (
              <span className="flex items-center gap-1">
                <BriefcaseIcon className="size-3" />
                {job.experience_min ?? 0}–{job.experience_max ?? "?"} yrs
              </span>
            )}
            {job.headcount > 1 && (
              <span className="flex items-center gap-1">
                <UsersIcon className="size-3" /> {job.headcount} positions
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto">
              <ClockIcon className="size-3" /> Assigned {timeAgo(assignment.created_at)}
            </span>
          </div>

          {/* Skills */}
          {job.skills.length > 0 && (
            <div className="mt-3">
              <SkillTagList skills={job.skills} max={5} />
            </div>
          )}

          {/* Searching animation */}
          {isSearching && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="size-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-xs text-blue-600 font-medium">AI searching Naukri & LinkedIn...</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-2">
          {isPending && onStartSearch && (
            <Button
              size="sm"
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => onStartSearch(assignment.id)}
            >
              <SearchIcon className="size-3.5" />
              Start Search
            </Button>
          )}
          <Link href={`/recruiter/jobs/${job.id}?assignmentId=${assignment.id}`}>
            <Button variant="outline" size="sm" className="h-8 w-full px-3 text-xs gap-1.5">
              View <ArrowRightIcon className="size-3" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
