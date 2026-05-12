"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Job, JobAssignment, Candidate, JobCandidate } from "@/lib/database.types";

// Will be replaced with real auth later
export const RECRUITER_ID = "00000000-0000-0000-0000-000000000002";

export interface AssignmentWithJob extends JobAssignment {
  jobs: Job;
}

export interface CandidateWithScore extends JobCandidate {
  candidates: Candidate;
}

export function useRecruiterDashboard() {
  const [assignments, setAssignments] = useState<AssignmentWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    const { data } = await supabase
      .from("job_assignments")
      .select("*, jobs(*)")
      .order("created_at", { ascending: false });
    if (data) setAssignments(data as AssignmentWithJob[]);
  }, []);

  useEffect(() => {
    fetchAssignments().finally(() => setLoading(false));

    // Realtime: new assignment arrives
    const channel = supabase
      .channel("recruiter-assignments")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "job_assignments" }, () => {
        fetchAssignments();
        toast("New job assigned to you!", { description: "Check your jobs list." });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "job_assignments" }, () => {
        fetchAssignments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAssignments]);

  async function startSearch(assignmentId: string) {
    const res = await fetch(`http://localhost:8000/assignments/${assignmentId}/start`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Failed to start search");
    toast.info("AI search started", { description: "Searching Naukri & LinkedIn for candidates..." });
    await fetchAssignments();
  }

  const pending    = assignments.filter((a) => a.status === "pending");
  const searching  = assignments.filter((a) => a.status === "searching");
  const completed  = assignments.filter((a) => a.status === "completed");

  return { assignments, pending, searching, completed, loading, startSearch, refetch: fetchAssignments };
}

export function useJobCandidates(jobId: string) {
  const [candidates, setCandidates] = useState<CandidateWithScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = useCallback(async () => {
    const { data } = await supabase
      .from("job_candidates")
      .select("*, candidates(*)")
      .eq("job_id", jobId)
      .order("match_score", { ascending: false });
    if (data) setCandidates(data as CandidateWithScore[]);
  }, [jobId]);

  useEffect(() => {
    fetchCandidates().finally(() => setLoading(false));

    // Realtime: new candidates found by AI agent
    const channel = supabase
      .channel(`candidates-${jobId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "job_candidates",
        filter: `job_id=eq.${jobId}`,
      }, () => {
        fetchCandidates();
        toast.success("New candidate found!", { description: "AI found a matching profile." });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId, fetchCandidates]);

  return { candidates, loading, refetch: fetchCandidates };
}
