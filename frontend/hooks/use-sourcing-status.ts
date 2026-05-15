"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface SourcingTask {
  id: string;
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  results_count: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useSourcingStatus(jobId: string) {
  const [task, setTask] = useState<SourcingTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/jobs/${jobId}/sourcing-status`);
      if (!res.ok) return;
      const data = await res.json();
      setTask(data.status ? data : null);
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Poll every 5 s while queued or running
  useEffect(() => {
    fetchStatus();

    intervalRef.current = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  // Stop polling when terminal state reached
  useEffect(() => {
    if (task?.status === "completed" || task?.status === "failed") {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [task?.status]);

  async function trigger(triggeredBy?: string) {
    setTriggering(true);
    try {
      const res = await fetch(`${API_URL}/api/jobs/${jobId}/source-talents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggered_by: triggeredBy ?? null }),
      });
      if (!res.ok) throw new Error("Failed to trigger sourcing");
      const data = await res.json();
      setTask({ ...data, results_count: 0, error: null, started_at: null, completed_at: null, created_at: new Date().toISOString(), job_id: jobId } as SourcingTask);
      // Resume polling
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchStatus, 5000);
    } finally {
      setTriggering(false);
    }
  }

  return { task, loading, triggering, trigger, refetch: fetchStatus };
}
