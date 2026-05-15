"use client";

import Link from "next/link";
import { MapPinIcon, UsersIcon, BriefcaseIcon, ClockIcon, MailIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkillTagList } from "@/components/ui/skill-tag";
import type { Job } from "@/lib/database.types";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface JobCardProps {
  job: Job;
  onReview?: (job: Job) => void;
}

export function JobCard({ job }: JobCardProps) {
  const isPending = job.status === "pending_approval";

  return (
    <Card className={`p-5 card-hover ${isPending ? "border-amber-200 bg-amber-50/30" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground truncate">{job.title}</h3>
            <StatusBadge status={job.status} />
            {job.source === "email" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                <MailIcon className="size-2.5" /> Email
              </span>
            )}
          </div>

          {/* Meta row */}
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
              <ClockIcon className="size-3" /> {timeAgo(job.created_at)}
            </span>
          </div>

          {/* Skills */}
          {job.skills.length > 0 && (
            <div className="mt-3">
              <SkillTagList skills={job.skills} max={6} />
            </div>
          )}
        </div>

        {/* Action */}
        {isPending && (
          <Link href={`/manager/jobs/${job.id}`}>
            <Button size="sm" className="shrink-0 h-8 px-3 text-xs">
              Review
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
