"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import type { UserRole } from "@/lib/database.types";

function getRoleHome(role: UserRole): string {
  if (role === "super_admin") return "/admin";
  if (role === "manager") return "/manager";
  return "/recruiter";
}

const DEMO_USERS = [
  { label: "Super Admin", email: "admin@hireaxis.in",     password: "Password123!", color: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-200" },
  { label: "Manager",     email: "arjun@hireaxis.in",     password: "Password123!", color: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200" },
  { label: "Recruiter",   email: "priya@hireaxis.in",     password: "Password123!", color: "bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 border-violet-200" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(emailVal: string, passwordVal: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailVal, password: passwordVal });
      if (error) throw error;

      // Refresh session so JWT picks up latest user_metadata (role)
      await supabase.auth.refreshSession();

      // Read role from public.users (source of truth)
      const { data: userRow } = await supabase.from("users").select("role").eq("id", data.user.id).single();
      const role = (userRow?.role ?? "recruiter") as UserRole;
      router.push(getRoleHome(role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn(email, password);
  }

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <BriefcaseIcon className="size-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight">HireAxis</span>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@hireaxis.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-9 text-sm"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-[11px] text-muted-foreground">Demo accounts</span>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  disabled={loading}
                  onClick={() => signIn(demo.email, demo.password)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${demo.color}`}
                >
                  <span>{demo.label}</span>
                  <span className="font-normal opacity-70">{demo.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          India&apos;s first AI-powered hiring workflow
        </p>
      </div>
      <Toaster position="top-right" richColors />
    </>
  );
}
