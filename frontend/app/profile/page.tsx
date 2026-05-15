"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { KeyRoundIcon, SaveIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/database.types";

function roleBadgeClass(role: UserRole) {
  if (role === "super_admin") return "bg-amber-500/15 text-amber-700";
  if (role === "manager") return "bg-blue-500/15 text-blue-700";
  return "bg-violet-500/15 text-violet-700";
}

function roleLabel(role: UserRole) {
  if (role === "super_admin") return "Super Admin";
  if (role === "manager") return "Manager";
  return "Recruiter";
}

export default function ProfilePage() {
  const { user } = useAuth();
  // Track only user-made edits — derive displayed value from user fallback
  const [edits, setEdits] = useState<{ name?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const name = edits.name ?? user?.name ?? "";
  const phone = edits.phone ?? user?.phone ?? "";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await apiFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name || undefined,
          phone: phone || undefined,
        }),
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!user) return;
    setResetting(true);
    try {
      await apiFetch(`/api/users/${user.id}/reset-password`, { method: "POST" });
      toast.success("Password reset email sent to " + user.email);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setResetting(false);
    }
  }

  const role = user?.role ?? "recruiter";

  return (
    <>
      <Shell role={role} pageTitle="Profile" pageSubtitle="Manage your account details">
        <div className="max-w-md space-y-6">
          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {initials}
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{user?.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className={cn("mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5", roleBadgeClass(role))}>
                {roleLabel(role)}
              </span>
            </div>
          </div>

          {/* Edit form */}
          <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setEdits((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your full name"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email <span className="text-muted-foreground">(read-only)</span></Label>
              <Input
                value={user?.email ?? ""}
                readOnly
                disabled
                className="h-9 text-sm opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setEdits((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="h-9 text-sm"
              />
            </div>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              <SaveIcon className="size-3.5" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </form>

          {/* Password reset */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-medium text-foreground">Password</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              A reset link will be sent to your email address.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleResetPassword}
              disabled={resetting}
            >
              <KeyRoundIcon className="size-3.5" />
              {resetting ? "Sending…" : "Send Password Reset Email"}
            </Button>
          </div>
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
