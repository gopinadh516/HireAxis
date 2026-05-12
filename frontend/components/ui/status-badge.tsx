import { cn } from "@/lib/utils";
import type { JobStatus, AssignmentStatus } from "@/lib/database.types";

type Status = JobStatus | AssignmentStatus;

const config: Record<Status, { label: string; className: string }> = {
  draft:            { label: "Draft",            className: "bg-slate-100 text-slate-600" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  active:           { label: "Active",           className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  searching:        { label: "Searching",        className: "bg-blue-50 text-blue-700 border border-blue-200" },
  closed:           { label: "Closed",           className: "bg-slate-100 text-slate-500" },
  pending:          { label: "Pending",          className: "bg-amber-50 text-amber-700 border border-amber-200" },
  reviewing:        { label: "Reviewing",        className: "bg-violet-50 text-violet-700 border border-violet-200" },
  completed:        { label: "Completed",        className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium", className)}>
      {label}
    </span>
  );
}
