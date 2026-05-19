"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { UserPlusIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface Recruiter { id: string; name: string; email: string; role: string; }

interface Props {
  jobId: string;
  /** Called after a successful reassign so the parent can refresh assignments */
  onAssigned?: () => void;
}

export function CaseAssignCard({ jobId, onAssigned }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Recruiter[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiFetch<Recruiter[]>("/api/approvals/recruiters").then(setPeople).catch(() => {});
  }, [open]);

  async function handleAssign() {
    if (!selectedId || !user) return;
    setSaving(true);
    try {
      await apiFetch(`/api/jobs/${jobId}/assign-validator`, {
        method: "POST",
        body: JSON.stringify({ manager_id: selectedId, assigned_by: user.id }),
      });
      const name = people.find((p) => p.id === selectedId)?.name ?? "assignee";
      toast.success(`Case assigned to ${name}`);
      setOpen(false);
      setSelectedId("");
      onAssigned?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setSaving(false);
    }
  }

  const admins     = people.filter((p) => p.role === "super_admin" && p.id !== user?.id);
  const managers   = people.filter((p) => p.role === "manager"     && p.id !== user?.id);
  const recruiters = people.filter((p) => p.role === "recruiter"   && p.id !== user?.id);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <UserPlusIcon className="size-4 text-muted-foreground" /> Assign Case
        </span>
        {open ? <ChevronUpIcon className="size-4 text-muted-foreground" /> : <ChevronDownIcon className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Assign to</Label>
              {user && selectedId !== user.id && (
                <button
                  type="button"
                  className="text-[10px] text-primary hover:underline"
                  onClick={() => setSelectedId(user.id)}
                >
                  Assign to self
                </button>
              )}
            </div>
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")}>
              <SelectTrigger className="h-8 text-xs">
                {selectedId
                  ? <span>{selectedId === user?.id ? `${user?.name} (me)` : people.find((p) => p.id === selectedId)?.name ?? "Selected"}</span>
                  : <SelectValue placeholder="Select person…" />}
              </SelectTrigger>
              <SelectContent>
                {user && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Self</div>
                    <SelectItem value={user.id}>{user.name} (me)</SelectItem>
                  </>
                )}
                {admins.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t mt-1 pt-2">Admins</div>
                    {admins.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div><p className="text-xs">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.email}</p></div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {managers.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t mt-1 pt-2">Managers</div>
                    {managers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div><p className="text-xs">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.email}</p></div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {recruiters.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t mt-1 pt-2">Recruiters</div>
                    {recruiters.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div><p className="text-xs">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.email}</p></div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm" className="w-full h-8 text-xs gap-1.5"
            onClick={handleAssign}
            disabled={!selectedId || saving}
          >
            {saving ? "Assigning…" : "Assign"}
          </Button>
        </div>
      )}
    </div>
  );
}
