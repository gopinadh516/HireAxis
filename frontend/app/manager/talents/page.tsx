"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTalents } from "@/hooks/use-talents";
import { VISA_STATUS_LABELS, TALENT_SOURCE_LABELS, VISA_STATUS_OPTIONS } from "@/lib/constants";
import { apiFetch } from "@/lib/api";
import {
  SearchIcon,
  UserIcon,
  BriefcaseIcon,
  MapPinIcon,
  StarIcon,
  StarOffIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Talent } from "@/lib/database.types";

const SOURCE_TABS = [
  { label: "All",           value: "all",    isPool: false },
  { label: "Internal",      value: "INTERNAL",       isPool: false },
  { label: "Self Applied",  value: "SELF_REGISTERED", isPool: false },
  { label: "Agent Sourced", value: "JOB_BOARD",      isPool: false },
  { label: "Talent Pool",   value: "pool",   isPool: true },
] as const;

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

function TalentRow({
  talent,
  showPoolAction,
  onPoolToggled,
  onDelete,
}: {
  talent: Talent;
  showPoolAction: boolean;
  onPoolToggled: () => void;
  onDelete: (id: string) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const displayName = talent.first_name
    ? `${talent.first_name} ${talent.last_name ?? ""}`.trim()
    : talent.name;

  async function handleTogglePool(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setToggling(true);
    try {
      await apiFetch(`/api/talents/${talent.id}/marketing`, { method: "PATCH" });
      const action = talent.is_marketable ? "removed from" : "added to";
      toast.success(`${displayName} ${action} talent pool`);
      onPoolToggled();
    } catch {
      toast.error("Failed to update pool status");
    } finally {
      setToggling(false);
    }
  }

  return (
    <Link href={`/manager/talents/${talent.id}`}>
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:bg-accent transition-colors cursor-pointer">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{displayName}</span>
            <VisaBadge status={talent.visa_status} />
            {talent.is_marketable && (
              <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border-amber-200">
                In Pool
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
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.preventDefault()}>
          <SourceBadge source={talent.talent_source} />
          {showPoolAction && (
            <Button
              size="sm"
              variant={talent.is_marketable ? "outline" : "secondary"}
              className="h-7 gap-1.5 text-xs"
              onClick={handleTogglePool}
              disabled={toggling}
            >
              {talent.is_marketable
                ? <><StarOffIcon className="size-3" /> Remove from Pool</>
                : <><StarIcon className="size-3" /> Add to Pool</>
              }
            </Button>
          )}
          {confirmDelete ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(talent.id); }}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false); }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true); }}
            >
              <TrashIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ManagerTalentsPage() {
  const [search, setSearch] = useState("");
  const [visaFilter, setVisaFilter] = useState("all");
  const [minExp, setMinExp] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  const activeTabDef = SOURCE_TABS.find((t) => t.value === activeTab)!;

  const { items, total, loading, error, refetch } = useTalents({
    search: search || undefined,
    visa_status: visaFilter === "all" ? undefined : visaFilter,
    talent_source: activeTabDef.isPool ? undefined : (activeTab === "all" ? undefined : activeTab),
    is_marketable: activeTabDef.isPool ? true : undefined,
    approval_status: "APPROVED",
    min_exp: minExp ? parseFloat(minExp) : undefined,
    page,
  });

  const handlePoolToggled = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/talents/${id}`, { method: "DELETE" });
      toast.success("Talent deleted");
      refetch();
    } catch {
      toast.error("Failed to delete talent");
    }
  }, [refetch]);

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Shell role="manager" pageTitle="Talents" pageSubtitle={`${total} talent${total !== 1 ? "s" : ""} ${activeTabDef.isPool ? "in pool" : "total"}`}>
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border mb-4">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); setPage(1); }}
              className={[
                "px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.value
                  ? tab.isPool
                    ? "border-amber-500 text-amber-600"
                    : "border-primary text-primary"
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
          <Link href="/manager/talents/new">
            <Button size="sm" className="h-8 gap-1.5 shrink-0">
              <PlusIcon className="size-3.5" /> Add Talent
            </Button>
          </Link>
        </div>

        {/* Pool info banner */}
        {activeTabDef.isPool && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            Talents in the pool are available for the job search agent to find matching open positions from LinkedIn, Naukri, and Dice.
          </div>
        )}

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
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                {activeTabDef.isPool ? "No talents in pool yet" : "No talents found"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {activeTabDef.isPool
                  ? "Use the All, Internal, or Self Applied tabs to add talents to the pool"
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            items.map((t) => (
              <TalentRow
                key={t.id}
                talent={t}
                showPoolAction={true}
                onPoolToggled={handlePoolToggled}
                onDelete={handleDelete}
              />
            ))
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
