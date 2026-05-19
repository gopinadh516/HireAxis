"use client";

import Link from "next/link";
import {
  ClipboardCheckIcon,
  SearchIcon,
  UsersIcon,
  CalendarIcon,
  BuildingIcon,
  TrophyIcon,
  CheckIcon,
} from "lucide-react";

export type PipelineStage =
  | "validate"
  | "search"
  | "finalize"
  | "internal_interview"
  | "client_interview"
  | "onboard"
  | "closed";

const STAGES: { key: PipelineStage; label: string; Icon: React.ElementType }[] = [
  { key: "validate",           label: "Validate",         Icon: ClipboardCheckIcon },
  { key: "search",             label: "Search",           Icon: SearchIcon },
  { key: "finalize",           label: "Finalize",         Icon: UsersIcon },
  { key: "internal_interview", label: "Internal Interview", Icon: CalendarIcon },
  { key: "client_interview",   label: "Client Interview", Icon: BuildingIcon },
  { key: "onboard",            label: "Onboard",          Icon: TrophyIcon },
];

const STAGE_ROUTES: Record<PipelineStage, string> = {
  validate:           "",
  search:             "/search",
  finalize:           "/finalize",
  internal_interview: "/internal-interview",
  client_interview:   "/client-interview",
  onboard:            "/onboard",
  closed:             "",
};

const ORDER = STAGES.map((s) => s.key);

interface PipelineBarProps {
  jobId: string;
  currentStage: PipelineStage | "closed" | null | undefined;
}

export function PipelineBar({ jobId, currentStage }: PipelineBarProps) {
  const current = currentStage ?? "validate";
  const currentIdx = ORDER.indexOf(current as PipelineStage);

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <ol className="flex items-center gap-0 overflow-x-auto">
        {STAGES.map(({ key, label, Icon }, idx) => {
          const isDone    = idx < currentIdx;
          const isActive  = key === current;
          const isFuture  = idx > currentIdx;
          const route     = `/manager/jobs/${jobId}${STAGE_ROUTES[key]}`;

          const dot = (
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold
                ${isDone  ? "border-primary bg-primary text-primary-foreground"  : ""}
                ${isActive ? "border-primary bg-primary/10 text-primary"          : ""}
                ${isFuture ? "border-border bg-muted text-muted-foreground"        : ""}
              `}
            >
              {isDone ? <CheckIcon className="size-3" /> : <Icon className="size-3" />}
            </span>
          );

          return (
            <li key={key} className="flex items-center min-w-0">
              {/* connector */}
              {idx > 0 && (
                <span className={`h-px w-4 shrink-0 ${idx <= currentIdx ? "bg-primary" : "bg-border"}`} />
              )}

              <div className="flex flex-col items-center gap-0.5 min-w-0">
                {isDone ? (
                  <Link href={route} className="flex flex-col items-center gap-0.5 group">
                    {dot}
                    <span className="text-[9px] font-medium text-primary group-hover:underline whitespace-nowrap hidden sm:block">{label}</span>
                  </Link>
                ) : (
                  <div className="flex flex-col items-center gap-0.5">
                    {dot}
                    <span className={`text-[9px] font-medium whitespace-nowrap hidden sm:block
                      ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}
                    `}>{label}</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
