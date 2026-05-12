"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkillTagList } from "@/components/ui/skill-tag";
import {
  MapPinIcon, UsersIcon, BriefcaseIcon, IndianRupeeIcon,
  MailIcon, ChevronDownIcon, ChevronUpIcon, CheckCircleIcon,
} from "lucide-react";
import type { Job, User } from "@/lib/database.types";

interface JobApprovalModalProps {
  job: Job | null;
  recruiters: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (jobId: string, recruiterId: string) => Promise<void>;
  onReject: (jobId: string) => Promise<void>;
}

export function JobApprovalModal({
  job, recruiters, open, onOpenChange, onApprove, onReject,
}: JobApprovalModalProps) {
  const [selectedRecruiter, setSelectedRecruiter] = useState<string>("");
  const [showRawEmail, setShowRawEmail] = useState(false);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  if (!job) return null;

  async function handleApprove() {
    if (!selectedRecruiter || !job) return;
    setLoading("approve");
    try {
      await onApprove(job.id, selectedRecruiter);
      onOpenChange(false);
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!job) return;
    setLoading("reject");
    try {
      await onReject(job.id);
      onOpenChange(false);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <BriefcaseIcon className="size-4 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-semibold">{job.title}</DialogTitle>
                <StatusBadge status={job.status} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {job.source === "email" && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MailIcon className="size-3" /> Parsed from email
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="px-6 py-4 space-y-4">
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              {job.location && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                  <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Location</p>
                    <p className="text-xs font-medium">{job.location}</p>
                  </div>
                </div>
              )}
              {(job.experience_min !== null || job.experience_max !== null) && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                  <BriefcaseIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Experience</p>
                    <p className="text-xs font-medium">{job.experience_min ?? 0}–{job.experience_max ?? "?"} yrs</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                <UsersIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Headcount</p>
                  <p className="text-xs font-medium">{job.headcount} position{job.headcount > 1 ? "s" : ""}</p>
                </div>
              </div>
              {(job.budget_min || job.budget_max) && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                  <IndianRupeeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Budget (LPA)</p>
                    <p className="text-xs font-medium">
                      {job.budget_min ?? "?"} – {job.budget_max ?? "?"} LPA
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Skills */}
            {job.skills.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Required Skills</p>
                <SkillTagList skills={job.skills} max={10} />
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Description</p>
                <p className="text-xs text-foreground leading-relaxed">{job.description}</p>
              </div>
            )}

            {/* Raw email collapsible */}
            {job.raw_email_text && (
              <div className="rounded-lg border border-border overflow-hidden">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setShowRawEmail(!showRawEmail)}
                >
                  <span className="flex items-center gap-1.5">
                    <MailIcon className="size-3" /> Original Email
                  </span>
                  {showRawEmail ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
                </button>
                {showRawEmail && (
                  <div className="border-t border-border bg-muted/30 px-3 py-2.5">
                    <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {job.raw_email_text}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Assign recruiter + actions */}
        <div className="px-6 py-4 border-t border-border space-y-3 bg-muted/20">
          <div>
            <p className="mb-1.5 text-xs font-medium text-foreground">Assign to Recruiter</p>
            <Select value={selectedRecruiter} onValueChange={(v) => setSelectedRecruiter(v ?? "")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select a recruiter..." />
              </SelectTrigger>
              <SelectContent>
                {recruiters.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={handleReject}
              disabled={!!loading}
            >
              {loading === "reject" ? "Rejecting..." : "Reject Job"}
            </Button>
            <Button
              size="sm"
              className="text-xs gap-1.5"
              onClick={handleApprove}
              disabled={!selectedRecruiter || !!loading}
            >
              <CheckCircleIcon className="size-3.5" />
              {loading === "approve" ? "Approving..." : "Approve & Assign"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
