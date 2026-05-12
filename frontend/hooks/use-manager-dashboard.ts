"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Job, User } from "@/lib/database.types";

const MANAGER_ID = "b640078d-41a4-4f2c-8255-26d33a1c85bb"; // Arjun Sharma (manager) — replace with real auth later

export function useManagerDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recruiters, setRecruiters] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setJobs(data as Job[]);
  }, []);

  const fetchRecruiters = useCallback(async () => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("role", "recruiter")
      .eq("is_active", true);
    if (data) setRecruiters(data as User[]);
  }, []);

  useEffect(() => {
    Promise.all([fetchJobs(), fetchRecruiters()]).finally(() => setLoading(false));

    // Realtime: new job drafts from email agent
    const channel = supabase
      .channel("manager-jobs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jobs" },
        (payload) => {
          const newJob = payload.new as Job;
          setJobs((prev) => [newJob, ...prev]);
          toast("New job requirement received", {
            description: newJob.title,
            action: { label: "Review", onClick: () => {} },
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchJobs, fetchRecruiters]);

  async function approveJob(jobId: string, recruiterId: string) {
    const res = await fetch(`http://localhost:8000/jobs/${jobId}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved_by: MANAGER_ID, recruiter_id: recruiterId }),
    });
    if (!res.ok) throw new Error("Failed to approve job");
    toast.success("Job approved and recruiter notified!");
    await fetchJobs();
  }

  async function rejectJob(jobId: string) {
    const res = await fetch(`http://localhost:8000/jobs/${jobId}/reject?rejected_by=${MANAGER_ID}`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Failed to reject job");
    toast.error("Job rejected");
    await fetchJobs();
  }

  const pending = jobs.filter((j) => j.status === "pending_approval");
  const active  = jobs.filter((j) => j.status === "active");
  const searching = jobs.filter((j) => j.status === "searching");

  return { jobs, pending, active, searching, recruiters, loading, approveJob, rejectJob };
}
