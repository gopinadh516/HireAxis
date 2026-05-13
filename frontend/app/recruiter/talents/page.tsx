"use client";

import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTalents } from "@/hooks/use-talents";
import { VISA_STATUS_LABELS, TALENT_SOURCE_LABELS, VISA_STATUS_OPTIONS } from "@/lib/constants";
import {
  PlusIcon,
  SearchIcon,
  UserIcon,
  BriefcaseIcon,
  MapPinIcon,
  LinkIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Talent } from "@/lib/database.types";

const SOURCE_TABS = [
  { label: "All",           value: "all" },
  { label: "Internal",      value: "INTERNAL" },
  { label: "Self Applied",  value: "SELF_REGISTERED" },
  { label: "Agent Sourced", value: "JOB_BOARD" },
] as const;

function ShareApplyLinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const applyUrl = typeof window !== "undefined" ? `${window.location.origin}/apply` : "/apply";

  function copyLink() {
    navigator.clipboard.writeText(applyUrl).then(() => {
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Share Apply Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Share this link on your website, job portals, or emails so candidates can self-apply directly.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-xs font-mono">{applyUrl}</span>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={copyLink}>
              {copied ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Submitted applications will appear in the <strong>Approvals</strong> queue for manager review.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VisaBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
      {VISA_STATUS_LABELS[status] ?? status}
    </span>
  );
}

const SOURCE_COLORS: Record<string, string> = {
  INTERNAL:        "bg-slate-50 text-slate-700 border-slate-200",
  SELF_REGISTERED: "bg-sky-50 text-sky-700 border-sky-200",
  JOB_BOARD:       "bg-violet-50 text-violet-700 border-violet-200",
  REFERRAL:        "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const label = TALENT_SOURCE_LABELS[source] ?? source;
  const cls   = SOURCE_COLORS[source] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function TalentRow({ talent }: { talent: Talent }) {
  const displayName = talent.first_name
    ? `${talent.first_name} ${talent.last_name ?? ""}`.trim()
    : talent.name;

  return (
    <Link href={`/recruiter/talents/${talent.id}`}>
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:bg-accent transition-colors cursor-pointer">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{displayName}</span>
            <VisaBadge status={talent.visa_status} />
            {talent.is_marketable && (
              <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                Marketable
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {talent.email && <span>{talent.email}</span>}
            {talent.current_title && (
              <span className="flex items-center gap-1">
                <BriefcaseIcon className="size-3" /> {talent.current_title}
              </span>
            )}
            {(talent.city || talent.location) && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3" /> {talent.city ?? talent.location}
              </span>
            )}
            {(talent.total_experience ?? talent.experience_years) && (
              <span>{talent.total_experience ?? talent.experience_years} yrs</span>
            )}
          </div>
          {talent.skills.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {talent.skills.slice(0, 5).map((s) => (
                <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
              ))}
              {talent.skills.length > 5 && (
                <span className="text-[10px] text-muted-foreground">+{talent.skills.length - 5}</span>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <SourceBadge source={talent.talent_source} />
        </div>
      </div>
    </Link>
  );
}

export default function TalentsPage() {
  const [search, setSearch] = useState("");
  const [visaFilter, setVisaFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [minExp, setMinExp] = useState("");
  const [page, setPage] = useState(1);
  const [shareOpen, setShareOpen] = useState(false);

  const { items, total, loading, error } = useTalents({
    search: search || undefined,
    visa_status: visaFilter === "all" ? undefined : visaFilter,
    talent_source: sourceFilter === "all" ? undefined : sourceFilter,
    approval_status: "APPROVED",
    min_exp: minExp ? parseFloat(minExp) : undefined,
    page,
  });

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Shell role="recruiter" userName="Priya Nair" pageTitle="Talents" pageSubtitle={`${total} talent${total !== 1 ? "s" : ""} in pool`}>
        {/* Source tabs */}
        <div className="flex items-center gap-1 border-b border-border mb-4">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setSourceFilter(tab.value); setPage(1); }}
              className={[
                "px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                sourceFilter === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search name, title, skills…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={visaFilter} onValueChange={(v) => { setVisaFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Visa status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visas</SelectItem>
              {VISA_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            className="h-8 w-28 text-xs"
            placeholder="Min exp (yrs)"
            value={minExp}
            onChange={(e) => { setMinExp(e.target.value); setPage(1); }}
          />
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setShareOpen(true)}>
            <LinkIcon className="size-3.5" /> Share Apply Link
          </Button>
          <Link href="/recruiter/talents/new">
            <Button size="sm" className="h-8 gap-1.5">
              <PlusIcon className="size-3.5" /> Add Talent
            </Button>
          </Link>
        </div>
        <ShareApplyLinkDialog open={shareOpen} onClose={() => setShareOpen(false)} />

        {/* List */}
        <div className="mt-4 space-y-2">
          {loading ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : error ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <UserIcon className="size-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No talents found</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Try adjusting your filters or add a new talent</p>
            </div>
          ) : (
            items.map((t) => <TalentRow key={t.id} talent={t} />)
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>Next</Button>
          </div>
        )}
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
