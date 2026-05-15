"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import type { Job, JobAssignment } from "@/lib/database.types";

export interface AssignmentWithJob extends JobAssignment {
  jobs: Job;
}

export function useMyWorkList() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("job_assignments")
      .select("*, jobs(*)")
      .eq("recruiter_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setAssignments(data as AssignmentWithJob[]);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    fetchAssignments().finally(() => setLoading(false));

    const channel = supabase
      .channel(`my-work-list-${user.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "job_assignments",
        filter: `recruiter_id=eq.${user.id}`,
      }, () => fetchAssignments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchAssignments]);

  return { assignments, loading, refetch: fetchAssignments };
}
