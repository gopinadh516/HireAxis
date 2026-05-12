import { cn } from "@/lib/utils";

export function SkillTag({ skill, className }: { skill: string; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary",
      className
    )}>
      {skill}
    </span>
  );
}

export function SkillTagList({ skills, max = 5 }: { skills: string[]; max?: number }) {
  const visible = skills.slice(0, max);
  const overflow = skills.length - max;
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((s) => <SkillTag key={s} skill={s} />)}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
