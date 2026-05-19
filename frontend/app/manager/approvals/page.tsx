"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTalents } from "@/hooks/use-talents";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  CheckIcon,
  XIcon,
  ExternalLinkIcon,
  UserIcon,
  BriefcaseIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeIcon,
  BotIcon,
  FileTextIcon,
  DownloadIcon,
  EyeIcon,
  LoaderIcon,
  UserCircleIcon,
  UsersIcon,
} from "lucide-react";
import { VISA_STATUS_LABELS, TALENT_SOURCE_LABELS, WORK_MODE_LABELS, CONTRACT_TYPES, formatSalary } from "@/lib/constants";
import { JobTypeBadge } from "@/components/jobs/JobTypeBadge";
import type { Talent } from "@/lib/database.types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  title: string;
  skills: string[];
  location: string | null;
  experience_min: number | null;
  experience_max: number | null;
  headcount: number;
  openings?: number | null;
  source: string;
  created_at: string;
  job_type?: string | null;
  work_mode?: string | null;
  company?: string | null;
  end_client_name?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  pay_rate_min?: number | null;
  pay_rate_max?: number | null;
  currency?: string | null;
  channel?: string | null;
  approval_note?: string | null;
}

interface Recruiter {
  id: string;
  name: string;
  email: string;
}

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ channel }: { channel: string | null }) {
  if (channel === "WEBSITE") {
    return (
      <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium bg-sky-50 text-sky-700 border-sky-200">
        <GlobeIcon className="size-2.5" /> Self Applied
      </span>
    );
  }
  if (channel === "AGENT") {
    return (
      <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium bg-violet-50 text-violet-700 border-violet-200">
        <BotIcon className="size-2.5" /> Agent Sourced
      </span>
    );
  }
  return null;
}

// ── Talent profile dialog ─────────────────────────────────────────────────────

interface TalentDetail extends Talent {
  talent_skills: Array<{ id: string; skill: string; level: string | null; years_of_exp: number | null }>;
  talent_documents: Array<{ id: string; type: string; file_name: string; file_url: string; file_size: number | null; mime_type: string | null; uploaded_at: string }>;
}

function docViewerUrl(doc: { file_url: string; file_name: string; mime_type: string | null }): string {
  const isPdf = doc.mime_type === "application/pdf" || doc.file_name.toLowerCase().endsWith(".pdf");
  if (isPdf) return doc.file_url;
  return `https://docs.google.com/viewer?url=${encodeURIComponent(doc.file_url)}&embedded=true`;
}

function TalentProfileDialog({
  talentId,
  onClose,
  onApproved,
  onRejected,
}: {
  talentId: string;
  onClose: () => void;
  onApproved: () => void;
  onRejected: () => void;
}) {
  const [detail, setDetail] = useState<TalentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [viewDoc, setViewDoc] = useState<TalentDetail["talent_documents"][0] | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    apiFetch<TalentDetail>(`/api/talents/${talentId}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [talentId]);

  const displayName = detail
    ? detail.first_name ? `${detail.first_name} ${detail.last_name ?? ""}`.trim() : detail.name
    : "";

  async function handleApprove() {
    setApproving(true);
    try {
      await apiFetch(`/api/talents/${talentId}/approve`, { method: "PATCH" });
      toast.success(`${displayName} approved`);
      onApproved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      await apiFetch(`/api/talents/${talentId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ note: rejectNote || null }),
      });
      toast.success(`${displayName} rejected`);
      onRejected();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
            <DialogTitle className="text-sm">Talent Profile</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : !detail ? (
              <p className="text-sm text-destructive text-center py-8">Failed to load talent details.</p>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{displayName}</h3>
                    {detail.current_title && (
                      <p className="text-sm text-muted-foreground">
                        {detail.current_title}{detail.current_company && ` @ ${detail.current_company}`}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <SourceBadge channel={detail.channel ?? null} />
                      {detail.visa_status && (
                        <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                          {VISA_STATUS_LABELS[detail.visa_status] ?? detail.visa_status}
                        </span>
                      )}
                      <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium bg-slate-50 text-slate-600 border-slate-200">
                        {TALENT_SOURCE_LABELS[detail.talent_source] ?? detail.talent_source}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contact</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {detail.email && (
                      <div className="flex items-center gap-2">
                        <MailIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <a href={`mailto:${detail.email}`} className="text-primary hover:underline truncate">{detail.email}</a>
                      </div>
                    )}
                    {detail.phone && (
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>{detail.phone}</span>
                      </div>
                    )}
                    {(detail.city || detail.location) && (
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>{[detail.city, detail.state, detail.country].filter(Boolean).join(", ") || detail.location}</span>
                      </div>
                    )}
                    {detail.linkedin_url && (
                      <div className="flex items-center gap-2">
                        <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <a href={detail.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a>
                      </div>
                    )}
                    {(detail as Talent & { referred_by?: string | null }).referred_by && (
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-xs">Referred by <strong>{(detail as Talent & { referred_by?: string | null }).referred_by}</strong></span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Professional */}
                {(detail.total_experience != null || detail.summary) && (
                  <section>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Professional</p>
                    {detail.total_experience != null && (
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <BriefcaseIcon className="size-3.5 text-muted-foreground" />
                        <span>{detail.total_experience} years experience</span>
                      </div>
                    )}
                    {detail.summary && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{detail.summary}</p>
                    )}
                  </section>
                )}

                {/* Skills */}
                {(detail.talent_skills?.length > 0 || detail.skills?.length > 0) && (
                  <section>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(detail.talent_skills?.length > 0
                        ? detail.talent_skills.map((s) => s.skill)
                        : detail.skills
                      ).map((skill) => (
                        <span key={skill} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{skill}</span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Documents */}
                {detail.talent_documents?.length > 0 && (
                  <section>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Documents</p>
                    <div className="space-y-2">
                      {detail.talent_documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div className="flex items-center gap-3">
                            <FileTextIcon className="size-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-medium">{doc.file_name}</p>
                              <p className="text-[10px] text-muted-foreground">{doc.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setViewDoc(doc)}>
                              <EyeIcon className="size-3.5" /> View
                            </Button>
                            <a href={doc.file_url} download={doc.file_name}>
                              <Button variant="ghost" size="icon" className="size-7">
                                <DownloadIcon className="size-3.5" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setRejectOpen(true)}
              disabled={loadingDetail || !detail}
            >
              <XIcon className="size-3.5" /> Reject
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={loadingDetail || !detail || approving}
            >
              <CheckIcon className="size-3.5" /> {approving ? "Approving…" : "Approve"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Reject {displayName}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Reason (optional)</Label>
              <Input
                placeholder="e.g. Skills don't match current openings"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleReject} disabled={rejecting}>
                {rejecting ? "Rejecting…" : "Confirm Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document viewer */}
      <Dialog open={!!viewDoc} onOpenChange={(o) => { if (!o) setViewDoc(null); }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
            <DialogTitle className="text-sm font-medium">{viewDoc?.file_name}</DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <iframe
              src={docViewerUrl(viewDoc)}
              className="flex-1 w-full border-0 rounded-b-lg"
              title={viewDoc.file_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Talent approval card ──────────────────────────────────────────────────────

function TalentApprovalCard({
  talent,
  onApproved,
  onRejected,
}: {
  talent: Talent;
  onApproved: () => void;
  onRejected: () => void;
}) {
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const displayName = talent.first_name
    ? `${talent.first_name} ${talent.last_name ?? ""}`.trim()
    : talent.name;

  async function handleApprove() {
    setApproving(true);
    try {
      await apiFetch(`/api/talents/${talent.id}/approve`, { method: "PATCH" });
      toast.success(`${displayName} approved`);
      onApproved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      await apiFetch(`/api/talents/${talent.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ note: rejectNote || null }),
      });
      toast.success(`${displayName} rejected`);
      setRejectOpen(false);
      onRejected();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold">{displayName}</h4>
                  <SourceBadge channel={talent.channel ?? null} />
                </div>
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {talent.email && (
                    <span className="flex items-center gap-1">
                      <MailIcon className="size-3" /> {talent.email}
                    </span>
                  )}
                  {talent.phone && (
                    <span className="flex items-center gap-1">
                      <PhoneIcon className="size-3" /> {talent.phone}
                    </span>
                  )}
                  {talent.current_title && (
                    <span className="flex items-center gap-1">
                      <BriefcaseIcon className="size-3" /> {talent.current_title}
                    </span>
                  )}
                  {(talent.total_experience ?? talent.experience_years) != null && (
                    <span>{talent.total_experience ?? talent.experience_years} yrs exp</span>
                  )}
                  {(talent.city || talent.location) && (
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="size-3" /> {talent.city ?? talent.location}
                    </span>
                  )}
                  {talent.visa_status && (
                    <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                      {VISA_STATUS_LABELS[talent.visa_status] ?? talent.visa_status}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {talent.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {talent.skills.slice(0, 6).map((s) => (
                  <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                ))}
                {talent.skills.length > 6 && (
                  <span className="text-[10px] text-muted-foreground">+{talent.skills.length - 6}</span>
                )}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              {talent.linkedin_url && (
                <a href={talent.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                    <ExternalLinkIcon className="size-3" /> LinkedIn
                  </Button>
                </a>
              )}
              <Link href={`/manager/talents/${talent.id}`}>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  <EyeIcon className="size-3" /> View Profile
                </Button>
              </Link>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setRejectOpen(true)}
              >
                <XIcon className="size-3" /> Reject
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={handleApprove}
                disabled={approving}
              >
                <CheckIcon className="size-3" /> {approving ? "Approving…" : "Approve"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Reject {displayName}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Reason (optional)</Label>
              <Input
                placeholder="e.g. Skills don't match current openings"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleReject} disabled={rejecting}>
                {rejecting ? "Rejecting…" : "Confirm Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}

// ── Job approval card ─────────────────────────────────────────────────────────

function JobApprovalCard({
  job,
  onRejected,
}: {
  job: Job;
  onRejected: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);

  async function handleReject() {
    setRejecting(true);
    try {
      await apiFetch(`/api/approvals/jobs/${job.id}/reject`, { method: "PATCH" });
      toast.success(`"${job.title}" rejected`);
      onRejected();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <BriefcaseIcon className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {job.job_type && <JobTypeBadge type={job.job_type} />}
              <SourceBadge channel={job.channel ?? null} />
              {!job.channel && (
                <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border-amber-200 capitalize">
                  via {job.source}
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold">{job.title}</h4>
            {(job.company ?? job.end_client_name) && (
              <p className="text-xs text-muted-foreground">{job.company ?? job.end_client_name}</p>
            )}
            <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPinIcon className="size-3" /> {job.location}
                </span>
              )}
              {job.work_mode && (
                <span className="flex items-center gap-1">
                  <BriefcaseIcon className="size-3" /> {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
                </span>
              )}
              {(job.experience_min != null || job.experience_max != null) && (
                <span className="flex items-center gap-1">
                  <BriefcaseIcon className="size-3" /> {job.experience_min ?? 0}–{job.experience_max ?? "?"} yrs
                </span>
              )}
              <span className="flex items-center gap-1">
                <UsersIcon className="size-3" /> {job.openings ?? job.headcount} position{(job.openings ?? job.headcount) !== 1 ? "s" : ""}
              </span>
              {(() => {
                const isContract = (CONTRACT_TYPES as readonly string[]).includes(job.job_type ?? "");
                const salaryText = isContract
                  ? formatSalary(job.pay_rate_min, job.pay_rate_max, job.currency ?? undefined, "/hr")
                  : formatSalary(job.salary_min, job.salary_max, job.currency ?? undefined, "/yr");
                return salaryText ? <span className="flex items-center gap-1">$ {salaryText}</span> : null;
              })()}
            </div>
            {job.approval_note && (
              <p className="mt-1 text-[11px] text-muted-foreground italic line-clamp-1">{job.approval_note}</p>
            )}
            {job.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {job.skills.slice(0, 6).map((s) => (
                  <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                ))}
                {job.skills.length > 6 && (
                  <span className="text-[10px] text-muted-foreground">+{job.skills.length - 6}</span>
                )}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleReject}
                disabled={rejecting}
              >
                <XIcon className="size-3" /> {rejecting ? "Rejecting…" : "Reject"}
              </Button>
              <Link href={`/manager/jobs/${job.id}`}>
                <Button size="sm" className="h-7 gap-1.5 text-xs">
                  <EyeIcon className="size-3" /> Review &amp; Initiate
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const [removedTalentIds, setRemovedTalentIds] = useState<Set<string>>(new Set());

  const { items: talents, total: talentTotal, loading: talentsLoading, error: talentsError } = useTalents({
    approval_status: "PENDING",
    page: 1,
  });

  function dismissTalent(id: string) {
    setRemovedTalentIds((prev) => new Set([...prev, id]));
  }

  const visibleTalents = talents.filter((t) => !removedTalentIds.has(t.id));

  return (
    <>
      <Shell role="manager" pageTitle="Approvals" pageSubtitle="Review pending talent requests">
        <div className="space-y-3">
          {talentsLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)
          ) : talentsError ? (
            <p className="text-sm text-destructive">{talentsError}</p>
          ) : visibleTalents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <UserIcon className="size-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No pending talent requests</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Self-applied and agent-sourced talents will appear here</p>
            </div>
          ) : (
            visibleTalents.map((t) => (
              <TalentApprovalCard
                key={t.id}
                talent={t}
                onApproved={() => dismissTalent(t.id)}
                onRejected={() => dismissTalent(t.id)}
              />
            ))
          )}
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
