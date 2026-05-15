"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Job } from "@/lib/database.types";

export interface JobListResponse {
  items: Job[];
  total: number;
  page: number;
  page_size: number;
}

export interface JobFilters {
  search?: string;
  status?: string;
  job_status?: string;
  job_type?: string;
  work_mode?: string;
  is_active?: boolean;
  approval_status?: string;
  source?: string;
  channel?: string;
  page?: number;
}

export function useJobs(filters: JobFilters = {}) {
  const [data, setData] = useState<JobListResponse>({ items: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search)           params.set("search", filters.search);
      if (filters.status)           params.set("status", filters.status);
      if (filters.job_status)       params.set("job_status", filters.job_status);
      if (filters.job_type)         params.set("job_type", filters.job_type);
      if (filters.work_mode)        params.set("work_mode", filters.work_mode);
      if (filters.is_active !== undefined) params.set("is_active", String(filters.is_active));
      if (filters.approval_status)  params.set("approval_status", filters.approval_status);
      if (filters.source)           params.set("source", filters.source);
      if (filters.channel)          params.set("channel", filters.channel);
      if (filters.page)             params.set("page", String(filters.page));

      const result = await apiFetch<JobListResponse>(`/api/jobs/?${params}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [
    filters.search,
    filters.status,
    filters.job_status,
    filters.job_type,
    filters.work_mode,
    filters.is_active,
    filters.approval_status,
    filters.source,
    filters.channel,
    filters.page,
  ]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}
