"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { PlusIcon, KeyRoundIcon } from "lucide-react";
import type { User } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const TABS = ["All", "Managers", "Recruiters", "Inactive"] as const;
type Tab = typeof TABS[number];

function roleBadge(role: string) {
  if (role === "super_admin") return "bg-amber-500/15 text-amber-700";
  if (role === "manager") return "bg-blue-500/15 text-blue-700";
  return "bg-violet-500/15 text-violet-700";
}

function roleLabel(role: string) {
  if (role === "super_admin") return "Super Admin";
  if (role === "manager") return "Manager";
  return "Recruiter";
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function UserRow({
  user,
  onToggle,
  onReset,
}: {
  user: User;
  onToggle: (id: string, current: boolean) => void;
  onReset: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {initials(user.name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
          <span className={cn("text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5", roleBadge(user.role))}>
            {roleLabel(user.role)}
          </span>
          {!user.is_active && (
            <span className="text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
              Inactive
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => onReset(user.id)}
          title="Send password reset email"
        >
          <KeyRoundIcon className="size-3.5" />
          Reset
        </Button>
        <Switch
          checked={user.is_active}
          onCheckedChange={() => onToggle(user.id, user.is_active)}
          aria-label={user.is_active ? "Deactivate user" : "Activate user"}
        />
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"manager" | "recruiter">("recruiter");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await apiFetch<User[]>("/api/users/");
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await apiFetch(`/api/users/${id}/toggle`, { method: "PATCH" });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: !current } : u))
      );
      toast.success(current ? "User deactivated" : "User activated");
    } catch {
      toast.error("Failed to toggle user");
    }
  }

  async function handleReset(id: string) {
    try {
      await apiFetch(`/api/users/${id}/reset-password`, { method: "POST" });
      toast.success("Password reset email sent");
    } catch {
      toast.error("Failed to send reset email");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await apiFetch<{ id: string; temp_password: string }>("/api/users/", {
        method: "POST",
        body: JSON.stringify({ name: newName, email: newEmail, role: newRole, password: newPassword || undefined }),
      });
      toast.success(`User created. Temp password: ${result.temp_password}`);
      setShowCreate(false);
      setNewName(""); setNewEmail(""); setNewRole("recruiter"); setNewPassword("");
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  const filtered = users.filter((u) => {
    if (tab === "Managers" && u.role !== "manager") return false;
    if (tab === "Recruiters" && u.role !== "recruiter") return false;
    if (tab === "Inactive" && u.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      <Shell role="super_admin" pageTitle="User Management" pageSubtitle="Create and manage accounts">
        {/* Tabs + Add button */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-0 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-2 text-sm transition-colors border-b-2 -mb-px",
                  tab === t
                    ? "border-primary font-medium text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
                <span className="ml-1.5 text-[11px] text-muted-foreground">
                  {t === "All"
                    ? users.length
                    : t === "Managers"
                    ? users.filter((u) => u.role === "manager").length
                    : t === "Recruiters"
                    ? users.filter((u) => u.role === "recruiter").length
                    : users.filter((u) => !u.is_active).length}
                </span>
              </button>
            ))}
          </div>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
            <PlusIcon className="size-3.5" /> Add User
          </Button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs max-w-xs"
          />
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <UserRow key={u.id} user={u} onToggle={handleToggle} onReset={handleReset} />
            ))}
          </div>
        )}
      </Shell>

      {/* Create user dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@hireaxis.in"
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "manager" | "recruiter")}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Temporary Password <span className="text-muted-foreground">(leave blank to auto-generate)</span></Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="h-9 text-sm"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors />
    </>
  );
}
