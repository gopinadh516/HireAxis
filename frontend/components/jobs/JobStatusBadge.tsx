import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/lib/constants";

export function JobStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const label = JOB_STATUS_LABELS[status] ?? status;
  const color = JOB_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      {label}
    </span>
  );
}
