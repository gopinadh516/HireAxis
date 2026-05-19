"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineBar } from "@/components/jobs/PipelineBar";
import { CaseAssignCard } from "@/components/jobs/CaseAssignCard";
import { JobTypeBadge } from "@/components/jobs/JobTypeBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeftIcon, TrophyIcon, UserIcon, CheckCircle2Icon,
  XCircleIcon, MinusCircleIcon, MapPinIcon, BriefcaseIcon, UsersIcon,
} from "lucide-react";
import { formatJobId, WORK_MODE_LABELS } from "@/lib/constants";
import type { Job, Offer } from "@/lib/database.types";

interface Talent { id: string; name: string | null; first_name: string | null; last_name: string | null; current_title: string | null; current_company: string | null; }
interface JobTalent { id: string; talent_id: string; status: string; match_score: number | null; talents?: Talent; }

function talentName(t: Talent) {
  if (t.first_name || t.last_name) return `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim();
  return t.name ?? "Unknown";
}

function OfferCard({ jobId, jt, offer, onUpdated }: { jobId: string; jt: JobTalent; offer: Offer | undefined; onUpdated: () => void; }) {
  const t = jt.talents;
  const [rate, setRate]         = useState(offer?.offered_rate != null ? String(offer.offered_rate) : "");
  const [salary, setSalary]     = useState(offer?.offered_salary != null ? String(offer.offered_salary) : "");
  const [currency, setCurrency] = useState(offer?.currency ?? "USD");
  const [startDate, setStartDate] = useState(offer?.start_date ?? "");
  const [notes, setNotes]       = useState(offer?.notes ?? "");
  const [saving, setSaving]     = useState(false);
  const [updating, setUpdating] = useState(false);
  const offerStatus = offer?.status;

  async function handleExtend() {
    setSaving(true);
    try {
      const payload = { offered_rate: rate ? Number(rate) : null, offered_salary: salary ? Number(salary) : null, start_date: startDate || null, notes: notes || null };
      if (offer) {
        await apiFetch(`/api/jobs/${jobId}/offers/${offer.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Offer updated");
      } else {
        await apiFetch(`/api/jobs/${jobId}/offers`, { method: "POST", body: JSON.stringify({ talent_id: jt.talent_id, currency, ...payload }) });
        toast.success("Offer extended");
      }
      onUpdated();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleStatus(status: "accepted" | "declined" | "withdrawn") {
    if (!offer) { toast.error("Extend an offer first"); return; }
    setUpdating(true);
    try {
      await apiFetch(`/api/jobs/${jobId}/offers/${offer.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast.success(status === "accepted" ? "Offer accepted — candidate placed!" : `Offer ${status}`);
      onUpdated();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setUpdating(false); }
  }

  return (
    <div className={`rounded-xl border bg-card p-5 space-y-4 ${offerStatus === "accepted" ? "border-emerald-300 bg-emerald-50/30" : offerStatus ? "border-border opacity-70" : "border-primary/30"}`}>
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10"><UserIcon className="size-4 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{t ? talentName(t) : "Unknown"}</p>
          {t?.current_title && <p className="text-xs text-muted-foreground">{t.current_title}{t.current_company ? ` · ${t.current_company}` : ""}</p>}
        </div>
        {offerStatus && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize
            ${offerStatus === "accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : offerStatus === "declined" ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            {offerStatus}
          </span>
        )}
      </div>

      {(!offerStatus || offerStatus === "extended") && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Bill Rate ($/hr)</Label><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 85" className="h-8 text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs">Annual Salary ($)</Label><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 120000" className="h-8 text-xs" /></div>
            <div className="space-y-1">
              <Label className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["USD","INR","GBP","EUR","CAD","AUD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" /></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Offer conditions…" className="min-h-14 text-xs resize-none" /></div>
          </div>
          <Button size="sm" variant="outline" onClick={handleExtend} disabled={saving} className="h-7 text-xs gap-1.5">
            {saving ? "Saving…" : (offer ? "Update Offer" : "Extend Offer")}
          </Button>

          {offer && offerStatus === "extended" && (
            <div className="flex gap-2 border-t border-border pt-4">
              <Button size="sm" className="h-7 flex-1 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={updating} onClick={() => handleStatus("accepted")}><CheckCircle2Icon className="size-3.5" /> Accept</Button>
              <Button size="sm" variant="outline" className="h-7 flex-1 text-xs gap-1 text-destructive border-destructive/30" disabled={updating} onClick={() => handleStatus("declined")}><XCircleIcon className="size-3.5" /> Decline</Button>
              <Button size="sm" variant="outline" className="h-7 flex-1 text-xs gap-1 text-muted-foreground" disabled={updating} onClick={() => handleStatus("withdrawn")}><MinusCircleIcon className="size-3.5" /> Withdraw</Button>
            </div>
          )}
        </>
      )}

      {offerStatus === "accepted" && (
        <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
          <TrophyIcon className="size-4" /> Candidate placed!
          {offer?.start_date && <span className="text-xs font-normal text-muted-foreground ml-2">Starts {offer.start_date}</span>}
        </div>
      )}
    </div>
  );
}

export default function OnboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [jobTalents, setJobTalents] = useState<JobTalent[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const loadData = useCallback(async () => {
    const [j, jt, o] = await Promise.all([
      apiFetch<Job>(`/api/jobs/${id}`),
      apiFetch<JobTalent[]>(`/api/jobs/${id}/job-talents?status=client_passed`),
      apiFetch<Offer[]>(`/api/jobs/${id}/offers`),
    ]);
    setJob(j); setJobTalents(jt); setOffers(o);
  }, [id]);

  useEffect(() => { loadData().catch(() => {}).finally(() => setLoading(false)); }, [loadData]);

  const hasAccepted = offers.some((o) => o.status === "accepted");

  async function handleCloseJob() {
    setClosing(true);
    try {
      await apiFetch(`/api/jobs/${id}/pipeline-stage`, { method: "PATCH", body: JSON.stringify({ stage: "closed" }) });
      toast.success("Job closed — all positions filled!");
      router.push(`/manager/jobs/${id}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Cannot close yet"); }
    finally { setClosing(false); }
  }

  if (loading) return <Shell role="manager" pageTitle="Onboard"><div className="space-y-4">{[1,2].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}</div></Shell>;
  if (!job) return <Shell role="manager" pageTitle="Not Found"><p className="text-sm text-muted-foreground">Job not found.</p></Shell>;

  return (
    <>
      <Shell role="manager" pageTitle={job.title} pageSubtitle={formatJobId(job)}>
        <div className="mb-4">
          <Link href={`/manager/jobs/${id}/client-interview`}>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs -ml-2"><ArrowLeftIcon className="size-3.5" /> Back to Client Interview</Button>
          </Link>
        </div>

        <PipelineBar jobId={id} currentStage={job.pipeline_stage ?? "onboard"} />

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Left: job info + assign ── */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <JobTypeBadge type={job.job_type} />
                {job.case_id && <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">{job.case_id}</span>}
              </div>
              <h2 className="text-sm font-semibold">{job.title}</h2>
              <dl className="space-y-1.5 text-xs text-muted-foreground">
                {job.location && <div className="flex items-center gap-1.5"><MapPinIcon className="size-3" />{job.location}</div>}
                {job.work_mode && <div className="flex items-center gap-1.5"><BriefcaseIcon className="size-3" />{WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}</div>}
                <div className="flex items-center gap-1.5"><UsersIcon className="size-3" />{job.openings ?? job.headcount ?? 1} opening{(job.openings ?? job.headcount ?? 1) !== 1 ? "s" : ""}</div>
              </dl>
              {job.description && <p className="text-xs text-muted-foreground line-clamp-4 border-t border-border pt-2">{job.description}</p>}
            </div>

            <CaseAssignCard jobId={id} onAssigned={loadData} />
          </div>

          {/* ── Right: onboarding working area ── */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><TrophyIcon className="size-4 text-primary" /> Onboarding</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Extend offers and confirm candidate acceptance.</p>
            </div>

            {jobTalents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <p className="text-sm text-muted-foreground">No candidates passed the client interview yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobTalents.map((jt) => (
                  <OfferCard key={jt.id} jobId={id} jt={jt} offer={offers.find((o) => o.talent_id === jt.talent_id)} onUpdated={loadData} />
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleCloseJob} disabled={closing || !hasAccepted} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <TrophyIcon className="size-4" />{closing ? "Closing…" : "Close Job — All Positions Filled"}
              </Button>
            </div>
          </div>
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
