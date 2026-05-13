"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTalent, useJobMatches } from "@/hooks/use-talents";
import { VISA_STATUS_LABELS, APPROVAL_STATUS_COLORS } from "@/lib/constants";
import type { AISummary } from "@/lib/database.types";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeftIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  LinkIcon,
  FileTextIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  SparklesIcon,
  LoaderIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  StarIcon,
  StarOffIcon,
  BriefcaseIcon as JobIcon,
  SearchIcon,
} from "lucide-react";

type DocRecord = { id: string; type: string; file_name: string; file_url: string; file_size: number | null; mime_type: string | null; uploaded_at: string };

function viewerUrl(doc: DocRecord): string {
  const isPdf = doc.mime_type === "application/pdf" || doc.file_name.toLowerCase().endsWith(".pdf");
  if (isPdf) return doc.file_url;
  return `https://docs.google.com/viewer?url=${encodeURIComponent(doc.file_url)}&embedded=true`;
}

export default function ManagerTalentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { talent, loading, error, refetch } = useTalent(id);
  const { matches, loading: matchesLoading } = useJobMatches(id);
  const [toggling, setToggling] = useState(false);
  const [viewDoc, setViewDoc] = useState<DocRecord | null>(null);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);

  useEffect(() => {
    if (talent?.ai_summary) {
      setAiSummary(talent.ai_summary);
    }
  }, [talent]);

  async function generateSummary() {
    setSummaryLoading(true);
    try {
      const result = await apiFetch<AISummary>(`/api/talents/${id}/ai-summary`, { method: "POST" });
      setAiSummary(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate AI summary");
    } finally {
      setSummaryLoading(false);
    }
  }

  const displayName = talent
    ? talent.first_name
      ? `${talent.first_name} ${talent.last_name ?? ""}`.trim()
      : talent.name
    : "";

  async function handleTogglePool() {
    setToggling(true);
    try {
      await apiFetch(`/api/talents/${id}/marketing`, { method: "PATCH" });
      toast.success(talent?.is_marketable ? "Removed from talent pool" : "Added to talent pool");
      refetch();
    } catch {
      toast.error("Failed to update pool status");
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <Shell role="manager" userName="Arjun Sharma" pageTitle={displayName || "Talent Profile"} pageSubtitle="Talent details">
        <Link href="/manager/talents">
          <Button variant="ghost" size="sm" className="mb-4 h-8 gap-1.5 text-xs -ml-1">
            <ArrowLeftIcon className="size-3.5" /> Back to Talents
          </Button>
        </Link>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : talent ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-semibold">{displayName}</h2>
                  {talent.current_title && (
                    <p className="text-sm text-muted-foreground">{talent.current_title}
                      {talent.current_company && ` @ ${talent.current_company}`}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {talent.visa_status && (
                      <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                        {VISA_STATUS_LABELS[talent.visa_status] ?? talent.visa_status}
                      </span>
                    )}
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${APPROVAL_STATUS_COLORS[talent.approval_status]}`}>
                      {talent.approval_status}
                    </span>
                    {talent.is_marketable && (
                      <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border-amber-200">
                        In Pool
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant={talent.is_marketable ? "outline" : "secondary"}
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={handleTogglePool}
                disabled={toggling}
              >
                {talent.is_marketable
                  ? <><StarOffIcon className="size-3.5" /> Remove from Pool</>
                  : <><StarIcon className="size-3.5" /> Add to Pool</>
                }
              </Button>
            </div>

            {/* Contact */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {talent.email && (
                  <div className="flex items-center gap-2">
                    <MailIcon className="size-4 text-muted-foreground" />
                    <a href={`mailto:${talent.email}`} className="text-primary hover:underline">{talent.email}</a>
                  </div>
                )}
                {talent.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="size-4 text-muted-foreground" />
                    <span>{talent.phone}</span>
                  </div>
                )}
                {(talent.city || talent.location) && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="size-4 text-muted-foreground" />
                    <span>{[talent.city, talent.state, talent.country].filter(Boolean).join(", ") || talent.location}</span>
                  </div>
                )}
                {talent.linkedin_url && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="size-4 text-muted-foreground" />
                    <a href={talent.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      LinkedIn <ExternalLinkIcon className="size-3" />
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Professional */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Professional</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(talent.total_experience ?? talent.experience_years) != null && (
                  <div className="flex items-center gap-2">
                    <BriefcaseIcon className="size-4 text-muted-foreground" />
                    <span>{talent.total_experience ?? talent.experience_years} years experience</span>
                  </div>
                )}
              </div>
              {talent.summary && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{talent.summary}</p>
              )}
            </section>

            {/* Skills */}
            {(talent.talent_skills?.length > 0 || talent.skills?.length > 0) && (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {(talent.talent_skills?.length > 0
                    ? talent.talent_skills.map((s) => s.skill)
                    : talent.skills
                  ).map((skill) => (
                    <span key={skill} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{skill}</span>
                  ))}
                </div>
              </section>
            )}

            {/* AI Resume Summary */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Resume Summary</h3>
                  {aiSummary && (
                    <button onClick={() => setSummaryOpen((v) => !v)} className="text-muted-foreground hover:text-foreground">
                      {summaryOpen ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={aiSummary ? "outline" : "secondary"}
                  className="h-7 gap-1.5 text-xs"
                  onClick={generateSummary}
                  disabled={summaryLoading || !talent.talent_documents?.length}
                >
                  {summaryLoading
                    ? <><LoaderIcon className="size-3.5 animate-spin" /> Analyzing…</>
                    : aiSummary
                    ? <><RefreshCwIcon className="size-3.5" /> Regenerate</>
                    : <><SparklesIcon className="size-3.5" /> Generate AI Summary</>
                  }
                </Button>
              </div>

              {!talent.talent_documents?.length && !aiSummary && (
                <p className="text-xs text-muted-foreground">Upload a resume document to enable AI analysis.</p>
              )}

              {summaryLoading && (
                <div className="rounded-xl border border-dashed border-border py-10 flex flex-col items-center gap-2">
                  <LoaderIcon className="size-6 animate-spin text-primary/60" />
                  <p className="text-xs text-muted-foreground">Reading resume with AI — this takes 10–20 seconds…</p>
                </div>
              )}

              {!summaryLoading && aiSummary && summaryOpen && (
                <div className="space-y-5 rounded-xl border border-border bg-card p-5">
                  {aiSummary.overview && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Overview</p>
                      <p className="text-sm leading-relaxed">{aiSummary.overview}</p>
                    </div>
                  )}
                  {aiSummary.professional_experience?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Professional Experience</p>
                      <div className="space-y-3">
                        {aiSummary.professional_experience.map((exp, i) => (
                          <div key={i} className="pl-3 border-l-2 border-primary/20">
                            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                              <span className="text-sm font-medium">{exp.role}</span>
                              <span className="text-[11px] text-muted-foreground shrink-0">{exp.duration}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{exp.company}</p>
                            {exp.highlights?.length > 0 && (
                              <ul className="space-y-0.5">
                                {exp.highlights.map((h, j) => (
                                  <li key={j} className="text-xs text-muted-foreground flex gap-1.5">
                                    <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                                    {h}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiSummary.clients_and_vendors?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Clients & Vendors</p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiSummary.clients_and_vendors.map((c, i) => (
                          <span key={i} className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiSummary.technical_skills && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Technical Skills</p>
                      <div className="space-y-2">
                        {aiSummary.technical_skills.primary?.length > 0 && (
                          <div>
                            <span className="text-[10px] font-medium text-muted-foreground">Primary</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {aiSummary.technical_skills.primary.map((s, i) => (
                                <span key={i} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiSummary.technical_skills.secondary?.length > 0 && (
                          <div>
                            <span className="text-[10px] font-medium text-muted-foreground">Secondary</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {aiSummary.technical_skills.secondary.map((s, i) => (
                                <span key={i} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiSummary.technical_skills.tools_platforms?.length > 0 && (
                          <div>
                            <span className="text-[10px] font-medium text-muted-foreground">Tools & Platforms</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {aiSummary.technical_skills.tools_platforms.map((s, i) => (
                                <span key={i} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] text-violet-700">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {aiSummary.education?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Education</p>
                        <ul className="space-y-1">
                          {aiSummary.education.map((e, i) => (
                            <li key={i} className="text-xs">
                              <span className="font-medium">{e.degree}</span>
                              <span className="text-muted-foreground"> · {e.institution}{e.year ? ` (${e.year})` : ""}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiSummary.certifications?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Certifications</p>
                        <ul className="space-y-1">
                          {aiSummary.certifications.map((c, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {aiSummary.key_strengths?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Key Strengths</p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiSummary.key_strengths.map((s, i) => (
                          <span key={i} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Job Matches */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Matches</h3>
                {matches.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    {matches.length} match{matches.length !== 1 ? "es" : ""}
                  </span>
                )}
              </div>
              {matchesLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10">
                  <SearchIcon className="size-6 text-muted-foreground/30" />
                  <p className="mt-2 text-xs font-medium text-muted-foreground">No job matches yet</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/60">
                    {talent.is_marketable
                      ? "The job search agent will find matching open positions"
                      : "Add this talent to the pool to enable job matching"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {matches.map((m) => (
                    <div key={m.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-3 gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <JobIcon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{m.job_title}</p>
                          {m.company && <p className="text-[11px] text-muted-foreground">{m.company}</p>}
                          {m.location && <p className="text-[11px] text-muted-foreground">{m.location}</p>}
                          {m.skills_matched?.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {m.skills_matched.slice(0, 4).map((s: string) => (
                                <span key={s} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {m.match_score != null && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {m.match_score}% match
                          </span>
                        )}
                        {m.job_url && (
                          <a href={m.job_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px]">
                              View <ExternalLinkIcon className="size-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Documents */}
            {talent.talent_documents?.length > 0 && (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents</h3>
                <div className="space-y-2">
                  {talent.talent_documents.map((doc) => (
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
          </div>
        ) : null}
      </Shell>

      {/* Document Viewer */}
      <Dialog open={!!viewDoc} onOpenChange={(o) => { if (!o) setViewDoc(null); }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
            <DialogTitle className="text-sm font-medium">{viewDoc?.file_name}</DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <iframe
              src={viewerUrl(viewDoc)}
              className="flex-1 w-full border-0 rounded-b-lg"
              title={viewDoc.file_name}
            />
          )}
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors />
    </>
  );
}
