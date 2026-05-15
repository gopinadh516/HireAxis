"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CandidateCard } from "@/components/recruiter/candidate-card";
import { useSourcingStatus } from "@/hooks/use-sourcing-status";
import { useJobCandidates } from "@/hooks/use-recruiter-dashboard";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  DatabaseIcon,
  GlobeIcon,
  SearchIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  MapPinIcon,
  BriefcaseIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PoolMatch {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  current_title: string | null;
  current_company: string | null;
  total_experience: number | null;
  experience_years: number | null;
  skills: string[];
  visa_status: string | null;
  location: string | null;
  linkedin_url: string | null;
  match_score: number;
  matched_skills: string[];
}

// ── Pool match card ───────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : score >= 40
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${color}`}>
      {score}% match
    </span>
  );
}

function PoolMatchCard({ match, role }: { match: PoolMatch; role: "manager" | "recruiter" }) {
  const displayName =
    match.name ||
    [match.first_name, match.last_name].filter(Boolean).join(" ") ||
    "Unknown";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const exp = match.total_experience ?? match.experience_years ?? null;
  const profilePath = `/${role}/talents/${match.id}`;

  const allSkills = match.skills ?? [];
  const matchedSet = new Set(match.matched_skills.map((s) => s.toLowerCase()));
  const matched = allSkills.filter((s) => matchedSet.has(s.toLowerCase()));
  const others = allSkills.filter((s) => !matchedSet.has(s.toLowerCase()));
  const shownSkills = [...matched, ...others].slice(0, 7);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        {/* Initials */}
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{displayName}</span>
            <ScoreBadge score={match.match_score} />
          </div>
          {match.current_title && (
            <p className="text-xs text-muted-foreground mt-0.5">{match.current_title}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {match.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3" /> {match.location}
              </span>
            )}
            {exp !== null && (
              <span className="flex items-center gap-1">
                <BriefcaseIcon className="size-3" /> {exp} yr{exp !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* View Profile */}
        <Link href={profilePath} target="_blank">
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs shrink-0">
            View <ExternalLinkIcon className="size-3" />
          </Button>
        </Link>
      </div>

      {/* Skills */}
      {shownSkills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {shownSkills.map((s) => (
            <span
              key={s}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                matchedSet.has(s.toLowerCase())
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </span>
          ))}
          {allSkills.length > 7 && (
            <span className="text-[10px] text-muted-foreground">+{allSkills.length - 7}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  jobId: string;
  role: "manager" | "recruiter";
}

export function CandidateSourcingPanel({ jobId, role }: Props) {
  const [activeTab, setActiveTab] = useState<"pool" | "ai">("pool");

  // Pool state
  const [poolResults, setPoolResults] = useState<PoolMatch[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolSearched, setPoolSearched] = useState(false);
  const [poolError, setPoolError] = useState("");

  // AI sourcing (existing hooks)
  const { task: sourcingTask, triggering, trigger: triggerSourcing } = useSourcingStatus(jobId);
  const { candidates, loading: candidatesLoading, refetch } = useJobCandidates(jobId);

  async function handleSearchPool() {
    setPoolLoading(true);
    setPoolError("");
    try {
      const results = await apiFetch<PoolMatch[]>(`/api/jobs/${jobId}/pool-matches`);
      setPoolResults(results);
      setPoolSearched(true);
    } catch (err) {
      setPoolError(err instanceof Error ? err.message : "Search failed — try again");
    } finally {
      setPoolLoading(false);
    }
  }

  async function handleTriggerAI() {
    try {
      await triggerSourcing();
      toast.success("AI search queued — it will start shortly");
    } catch {
      toast.error("Failed to trigger AI search. Is the backend running?");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Tab header */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("pool")}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "pool"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <DatabaseIcon className="size-3.5" />
          Talent Pool
          {poolSearched && poolResults.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
              {poolResults.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "ai"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <GlobeIcon className="size-3.5" />
          AI Web Search
          {candidates.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
              {candidates.length}
            </span>
          )}
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Talent Pool tab ── */}
        {activeTab === "pool" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Search your approved talent pool for skill + experience matches.
              </p>
              <Button
                size="sm"
                variant={poolSearched ? "outline" : "default"}
                className="h-8 gap-1.5 text-xs shrink-0"
                disabled={poolLoading}
                onClick={handleSearchPool}
              >
                {poolLoading ? (
                  <RefreshCwIcon className="size-3.5 animate-spin" />
                ) : (
                  <SearchIcon className="size-3.5" />
                )}
                {poolLoading ? "Searching…" : poolSearched ? "Re-search" : "Search Talent Pool"}
              </Button>
            </div>

            {poolError && (
              <p className="text-xs text-destructive">{poolError}</p>
            )}

            {poolLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            )}

            {!poolLoading && poolSearched && poolResults.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10">
                <SearchIcon className="size-7 text-muted-foreground/30" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">No matches found</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Try adding more talents to your pool</p>
              </div>
            )}

            {!poolLoading && !poolSearched && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10">
                <DatabaseIcon className="size-7 text-muted-foreground/30" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">Ready to search</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Click &quot;Search Talent Pool&quot; to find matching candidates</p>
              </div>
            )}

            {!poolLoading && poolResults.length > 0 && (
              <div className="space-y-3">
                {poolResults.map((match) => (
                  <PoolMatchCard key={match.id} match={match} role={role} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── AI Web Search tab ── */}
        {activeTab === "ai" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Let the AI agent scan LinkedIn, Naukri, and Dice for matching profiles.
              </p>
              {(!sourcingTask || sourcingTask.status === "failed" || sourcingTask.status === "completed") && (
                <Button
                  size="sm"
                  variant={sourcingTask?.status === "completed" ? "outline" : "default"}
                  className="h-8 gap-1.5 text-xs shrink-0"
                  disabled={triggering}
                  onClick={handleTriggerAI}
                >
                  {triggering ? (
                    <RefreshCwIcon className="size-3.5 animate-spin" />
                  ) : (
                    <GlobeIcon className="size-3.5" />
                  )}
                  {triggering
                    ? "Queuing…"
                    : sourcingTask?.status === "completed"
                    ? "Re-run AI Search"
                    : "Start AI Search"}
                </Button>
              )}
            </div>

            {/* Sourcing status cards */}
            {sourcingTask?.status === "queued" && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <RefreshCwIcon className="size-3.5 text-amber-600 animate-spin" />
                <p className="text-xs text-amber-700 font-medium">Agent queued — will start shortly…</p>
              </div>
            )}
            {sourcingTask?.status === "running" && (
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                <div className="flex gap-1 shrink-0">
                  <span className="size-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0ms]" />
                  <span className="size-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:150ms]" />
                  <span className="size-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:300ms]" />
                </div>
                <p className="text-xs text-blue-700 font-medium">Scanning LinkedIn & Naukri…</p>
              </div>
            )}
            {sourcingTask?.status === "failed" && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                <p className="text-xs text-destructive font-medium">
                  Last run failed: {sourcingTask.error ?? "Unknown error"}
                </p>
              </div>
            )}
            {sourcingTask?.status === "completed" && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-700 font-medium">
                  Completed — {sourcingTask.results_count ?? candidates.length} profile{(sourcingTask.results_count ?? candidates.length) !== 1 ? "s" : ""} found
                </p>
              </div>
            )}

            {/* Candidate results */}
            {candidatesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10">
                <GlobeIcon className="size-7 text-muted-foreground/30" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">No AI results yet</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Click &quot;Start AI Search&quot; to find candidates from LinkedIn &amp; Naukri
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((c) => (
                  <CandidateCard key={c.id} item={c} onStatusChange={refetch} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
