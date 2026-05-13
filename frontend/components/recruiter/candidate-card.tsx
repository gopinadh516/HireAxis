"use client";

import { useState } from "react";
import { ExternalLinkIcon, Link2Icon, BuildingIcon, BriefcaseIcon, MapPinIcon, StarIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkillTagList } from "@/components/ui/skill-tag";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { CandidateWithScore } from "@/hooks/use-recruiter-dashboard";
import type { TalentStatus } from "@/lib/database.types";
type CandidateStatus = TalentStatus;

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    score >= 60 ? "bg-blue-50 text-blue-700 border-blue-200" :
                  "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <div className={`flex items-center gap-1 rounded-md border px-2 py-1 ${color}`}>
      <StarIcon className="size-3 fill-current" />
      <span className="text-xs font-semibold">{score}%</span>
    </div>
  );
}

interface CandidateCardProps {
  item: CandidateWithScore;
  onStatusChange?: () => void;
}

export function CandidateCard({ item, onStatusChange }: CandidateCardProps) {
  const c = item.talents;
  const [status, setStatus] = useState<CandidateStatus>(item.status);
  const [saving, setSaving] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setSaving(true);
    const { error } = await supabase
      .from("job_talents")
      .update({ status: newStatus as CandidateStatus })
      .eq("id", item.id);
    if (!error) {
      setStatus(newStatus as CandidateStatus);
      toast.success("Status updated");
      onStatusChange?.();
    }
    setSaving(false);
  }

  const statusColors: Record<CandidateStatus, string> = {
    sourced:     "bg-slate-100 text-slate-600",
    shortlisted: "bg-emerald-50 text-emerald-700",
    rejected:    "bg-red-50 text-red-600",
    contacted:   "bg-violet-50 text-violet-700",
  };

  return (
    <Card className="p-4 card-hover">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          {/* Name + score */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{c.name}</h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                {c.current_title && (
                  <span className="flex items-center gap-1">
                    <BriefcaseIcon className="size-3" /> {c.current_title}
                  </span>
                )}
                {c.current_company && (
                  <span className="flex items-center gap-1">
                    <BuildingIcon className="size-3" /> {c.current_company}
                  </span>
                )}
              </div>
            </div>
            <ScoreBadge score={item.match_score} />
          </div>

          {/* Meta */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {c.experience_years && (
              <span>{c.experience_years} yrs exp</span>
            )}
            {c.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3" /> {c.location}
              </span>
            )}
            {c.source && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                c.source === "linkedin" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
              }`}>
                {c.source === "linkedin" ? "LinkedIn" : "Naukri"}
              </span>
            )}
          </div>

          {/* Skills */}
          {c.skills.length > 0 && (
            <div className="mt-2.5">
              <SkillTagList skills={c.skills} max={5} />
            </div>
          )}

          {/* Footer: status + links */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <Select value={status} onValueChange={(v) => v && handleStatusChange(v)} disabled={saving}>
              <SelectTrigger className={`h-7 w-32 text-[11px] ${statusColors[status]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sourced"     className="text-xs">Sourced</SelectItem>
                <SelectItem value="shortlisted" className="text-xs">Shortlisted</SelectItem>
                <SelectItem value="contacted"   className="text-xs">Contacted</SelectItem>
                <SelectItem value="rejected"    className="text-xs">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1.5">
              {c.linkedin_url && (
                <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="size-7">
                    <Link2Icon className="size-3.5 text-blue-600" />
                  </Button>
                </a>
              )}
              {c.naukri_url && (
                <a href={c.naukri_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="size-7">
                    <ExternalLinkIcon className="size-3.5 text-orange-500" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
