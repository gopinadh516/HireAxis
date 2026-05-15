import { JOB_TYPE_LABELS, JOB_TYPE_COLORS } from "@/lib/constants";

export function JobTypeBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null;
  const label = JOB_TYPE_LABELS[type] ?? type;
  const color = JOB_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      {label}
    </span>
  );
}
