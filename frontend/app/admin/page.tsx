"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { apiFetch } from "@/lib/api";
import { UsersIcon, BriefcaseIcon, UserCircleIcon, UserCheckIcon } from "lucide-react";

interface Stats {
  total_users: number;
  managers: number;
  recruiters: number;
  total_jobs: number;
  total_talents: number;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className={`flex size-9 items-center justify-center rounded-lg mb-3 ${color}`}>
        <Icon className="size-5" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [users, jobs, talents] = await Promise.all([
          apiFetch<{ role: string }[]>("/api/users/"),
          apiFetch<unknown[]>("/api/jobs/?page_size=1"),
          apiFetch<{ total: number }>("/api/talents/?page_size=1"),
        ]);
        const managers = users.filter((u) => u.role === "manager").length;
        const recruiters = users.filter((u) => u.role === "recruiter").length;
        setStats({
          total_users: users.length,
          managers,
          recruiters,
          total_jobs: (jobs as { total?: number }).total ?? 0,
          total_talents: (talents as { total?: number }).total ?? 0,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <Shell role="super_admin" pageTitle="Admin Dashboard" pageSubtitle="HireAxis system overview">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Total Users" value={stats.total_users} icon={UsersIcon} color="bg-primary/10 text-primary" />
            <StatCard label="Managers" value={stats.managers} icon={UserCheckIcon} color="bg-blue-500/10 text-blue-600" />
            <StatCard label="Recruiters" value={stats.recruiters} icon={UserCircleIcon} color="bg-violet-500/10 text-violet-600" />
            <StatCard label="Jobs" value={stats.total_jobs} icon={BriefcaseIcon} color="bg-green-500/10 text-green-600" />
            <StatCard label="Talents" value={stats.total_talents} icon={UsersIcon} color="bg-orange-500/10 text-orange-600" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Failed to load stats.</p>
        )}
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
