"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Talent } from "@/lib/database.types";

export interface TalentListResponse {
  items: Talent[];
  total: number;
  page: number;
  page_size: number;
}

export interface TalentFilters {
  search?: string;
  visa_status?: string;
  approval_status?: string;
  is_marketable?: boolean;
  talent_source?: string;
  min_exp?: number;
  page?: number;
}

export function useTalents(filters: TalentFilters = {}) {
  const [data, setData] = useState<TalentListResponse>({ items: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search)          params.set("search", filters.search);
      if (filters.visa_status)     params.set("visa_status", filters.visa_status);
      if (filters.approval_status) params.set("approval_status", filters.approval_status);
      if (filters.is_marketable !== undefined) params.set("is_marketable", String(filters.is_marketable));
      if (filters.talent_source)   params.set("talent_source", filters.talent_source);
      if (filters.min_exp !== undefined) params.set("min_exp", String(filters.min_exp));
      if (filters.page)            params.set("page", String(filters.page));

      const result = await apiFetch<TalentListResponse>(`/api/talents/?${params}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load talents");
    } finally {
      setLoading(false);
    }
  }, [
    filters.search,
    filters.visa_status,
    filters.approval_status,
    filters.is_marketable,
    filters.talent_source,
    filters.min_exp,
    filters.page,
  ]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}

export interface TalentDetail extends Talent {
  talent_skills: Array<{ id: string; skill: string; level: string | null; years_of_exp: number | null }>;
  talent_documents: Array<{ id: string; type: string; file_name: string; file_url: string; file_size: number | null; mime_type: string | null; uploaded_at: string }>;
}

export function useTalent(id: string) {
  const [talent, setTalent] = useState<TalentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await apiFetch<TalentDetail>(`/api/talents/${id}`);
      setTalent(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load talent");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { talent, loading, error, refetch: fetch };
}

export interface JobMatch {
  id: string;
  talent_id: string;
  job_title: string;
  company: string | null;
  location: string | null;
  job_url: string | null;
  match_score: number | null;
  skills_matched: string[];
  source: string;
  status: string;
  found_at: string;
}

export function useJobMatches(talentId: string) {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!talentId) return;
    setLoading(true);
    try {
      const result = await apiFetch<JobMatch[]>(`/api/talents/${talentId}/job-matches`);
      setMatches(result);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [talentId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { matches, loading, refetch: fetch };
}

export function usePendingCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [talentsRes, jobsRes] = await Promise.all([
          apiFetch<{ count: number }>("/api/talents/approvals/pending-count"),
          apiFetch<{ count: number }>("/api/approvals/pending-jobs-count"),
        ]);
        setCount((talentsRes.count ?? 0) + (jobsRes.count ?? 0));
      } catch {
        setCount(0);
      }
    }
    load();
  }, []);

  return count;
}
