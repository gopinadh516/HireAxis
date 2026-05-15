"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { SkillTagList } from "@/components/ui/skill-tag";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { CandidateSourcingPanel } from "@/components/jobs/CandidateSourcingPanel";
import { PulsePanel } from "@/components/jobs/PulsePanel";
import { useRecruiterDashboard } from "@/hooks/use-recruiter-dashboard";
import { toast } from "sonner";
import {
  ArrowLeftIcon, SearchIcon, MapPinIcon,
  BriefcaseIcon, UsersIcon, IndianRupeeIcon, MailIcon,
  DollarSignIcon, FolderOpenIcon, CalendarIcon,
  UserIcon, PhoneIcon, BuildingIcon,
} from "lucide-react";
import { JobTypeBadge } from "@/components/jobs/JobTypeBadge";
import { CONTRACT_TYPES, WORK_MODE_LABELS, VISA_STATUS_LABELS, formatSalary } from "@/lib/constants";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assignmentId");

  const { assignments, startSearch } = useRecruiterDashboard();

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

  const isPending   = assignment?.status === "pending";
  const isSearching = assignment?.status === "searching";
  const isCompleted = assignment?.status === "completed";

  return (
    <>
      <Shell role="recruiter" pageTitle={job?.title ?? "Job Detail"}>
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

              {/* Case Header */}
              {job.case_id && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <FolderOpenIcon className="size-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">{job.case_id}</span>
                  </div>
                  {assignment && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="size-3" />
                        <span>Assigned {new Date(assignment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                        assignment.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        assignment.status === "searching" ? "bg-violet-50 text-violet-700 border-violet-200" :
                        assignment.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        "bg-muted text-muted-foreground border-border"
                      }`}>{assignment.status}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {job.job_type && <JobTypeBadge type={job.job_type} />}
                  {assignment && <StatusBadge status={assignment.status} />}
                </div>
                <h2 className="text-sm font-semibold mb-1">{job.title}</h2>
                {(job.company ?? job.end_client_name) && (
                  <p className="text-xs text-muted-foreground mb-3">{job.company ?? job.end_client_name}</p>
                )}

                {/* Details */}
                <div className="space-y-2">
                  {job.location && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPinIcon className="size-3.5 shrink-0" />
                      <span>{job.location}</span>
                    </div>
                  )}
                  {job.work_mode && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BriefcaseIcon className="size-3.5 shrink-0" />
                      <span>{WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}</span>
                    </div>
                  )}
                  {(job.experience_min != null || job.experience_max != null) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BriefcaseIcon className="size-3.5 shrink-0" />
                      <span>{job.experience_min ?? 0}–{job.experience_max ?? "?"} yrs experience</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UsersIcon className="size-3.5 shrink-0" />
                    <span>{job.openings ?? job.headcount} position{(job.openings ?? job.headcount) !== 1 ? "s" : ""}</span>
                  </div>
                  {(() => {
                    const isContract = (CONTRACT_TYPES as readonly string[]).includes(job.job_type ?? "");
                    if (isContract) {
                      const rate = job.internal_bill_rate;
                      return rate ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <DollarSignIcon className="size-3.5 shrink-0" />
                          <span>Bill Rate: <strong>${rate}/hr</strong></span>
                        </div>
                      ) : null;
                    }
                    const salaryText = formatSalary(job.salary_min, job.salary_max, job.currency, "/yr");
                    return salaryText ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <DollarSignIcon className="size-3.5 shrink-0" />
                        <span>{salaryText}</span>
                      </div>
                    ) : (job.budget_min || job.budget_max) ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <IndianRupeeIcon className="size-3.5 shrink-0" />
                        <span>{job.budget_min ?? "?"} – {job.budget_max ?? "?"} LPA</span>
                      </div>
                    ) : null;
                  })()}
                  {job.source === "email" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MailIcon className="size-3.5 shrink-0" />
                      <span>Sourced from email</span>
                    </div>
                  )}
                </div>

                {/* Visa requirements */}
                {job.visa_requirements && job.visa_requirements.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Visa</p>
                    <div className="flex flex-wrap gap-1">
                      {job.visa_requirements.map((v) => (
                        <span key={v} className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px]">
                          {VISA_STATUS_LABELS[v] ?? v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {(job.required_skills?.length > 0 || job.skills.length > 0) && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Required Skills</p>
                    <SkillTagList skills={job.required_skills?.length > 0 ? job.required_skills : job.skills} max={12} />
                  </div>
                )}

                {/* Description */}
                {job.description && (
                  <div className="mt-4">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Description</p>
                    <p className="text-xs text-foreground leading-relaxed line-clamp-6">{job.description}</p>
                  </div>
                )}

                {/* Hiring Manager */}
                {(job.end_client_contact || job.client_contact) && (
                  <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <UserIcon className="size-3" /> Hiring Manager
                    </p>
                    {(job.end_client_contact || job.client_contact) && (
                      <p className="text-xs font-medium">{job.end_client_contact ?? job.client_contact}</p>
                    )}
                    {(job.end_client_email || job.client_email) && (
                      <a href={`mailto:${job.end_client_email ?? job.client_email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <MailIcon className="size-3" />{job.end_client_email ?? job.client_email}
                      </a>
                    )}
                    {(job.end_client_phone || job.client_phone) && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <PhoneIcon className="size-3" />{job.end_client_phone ?? job.client_phone}
                      </p>
                    )}
                  </div>
                )}

                {/* Vendor / MSP */}
                {job.vendor_name && (
                  <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <BuildingIcon className="size-3" /> Vendor / MSP
                    </p>
                    <p className="text-xs font-medium">{job.vendor_name}</p>
                    {job.vendor_contact && <p className="text-xs text-muted-foreground">{job.vendor_contact}</p>}
                    {job.vendor_email && (
                      <a href={`mailto:${job.vendor_email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <MailIcon className="size-3" />{job.vendor_email}
                      </a>
                    )}
                    {job.vendor_phone && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <PhoneIcon className="size-3" />{job.vendor_phone}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Start Search CTA (assignment workflow) */}
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
                </div>
              )}
            </div>

            {/* Right: Pulse + Sourcing panel */}
            <div className="lg:col-span-2 space-y-4">
              <PulsePanel jobId={jobId} />
              <CandidateSourcingPanel jobId={jobId} role="recruiter" />
            </div>
          </div>
        )}
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
