"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JobForm, type JobFormData } from "@/components/jobs/JobForm";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeftIcon } from "lucide-react";
import { CONTRACT_TYPES } from "@/lib/constants";
import type { Job } from "@/lib/database.types";

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Job>(`/api/jobs/${id}`)
      .then(setJob)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: JobFormData) {
    setSubmitting(true);
    try {
      const isContract = (CONTRACT_TYPES as readonly string[]).includes(data.job_type);
      const payload: Record<string, unknown> = {
        title: data.title,
        job_type: data.job_type,
        work_mode: data.work_mode,
        job_status: data.job_status,
        location: data.location || null,

        application_deadline: data.application_deadline || null,
        description: data.description,
        currency: data.currency,
        required_skills: data.required_skills,
        nice_to_have: data.nice_to_have,
        skills: data.required_skills,
        visa_requirements: data.visa_requirements,
        openings: Number(data.openings) || 1,
        headcount: Number(data.openings) || 1,
        client_contact: data.client_contact || null,
        client_email: data.client_email || null,
        client_phone: data.client_phone || null,
        end_client_contact: data.end_client_contact || null,
        end_client_email: data.end_client_email || null,
        end_client_phone: data.end_client_phone || null,
        vendor_name: data.vendor_name || null,
        vendor_contact: data.vendor_contact || null,
        vendor_email: data.vendor_email || null,
        vendor_phone: data.vendor_phone || null,
      };

      if (isContract) {
        payload.end_client_name = data.end_client_name;
        payload.company = data.end_client_name;
        payload.pay_rate_min = data.pay_rate ? Number(data.pay_rate) : null;
        payload.pay_rate_max = data.pay_rate ? Number(data.pay_rate) : null;
        payload.bill_rate_min = data.bill_rate ? Number(data.bill_rate) : null;
        payload.bill_rate_max = data.bill_rate ? Number(data.bill_rate) : null;
      } else {
        payload.company = data.company;
        payload.client_name = data.company;
        payload.salary_min = data.salary ? Number(data.salary) : null;
        payload.salary_max = data.salary ? Number(data.salary) : null;
      }

      if (data.experience_min) payload.experience_min = Number(data.experience_min);

      await apiFetch(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      toast.success("Job updated");
      router.push(`/manager/jobs/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update job");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Shell role="manager" pageTitle="Edit Job">
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      </Shell>
    );
  }

  const initialData: Partial<JobFormData> = job ? {
    title: job.title,
    job_type: job.job_type ?? "FULL_TIME",
    work_mode: job.work_mode ?? "ONSITE",
    job_status: job.job_status ?? "OPEN",
    company: job.company ?? "",
    end_client_name: job.end_client_name ?? "",
    location: job.location ?? "",

    application_deadline: job.application_deadline ?? "",
    description: job.description ?? "",
    currency: job.currency ?? "USD",
    salary: (job.salary_min ?? job.salary_max)?.toString() ?? "",
    pay_rate: (job.pay_rate_min ?? job.pay_rate_max)?.toString() ?? "",
    bill_rate: (job.bill_rate_min ?? job.bill_rate_max)?.toString() ?? "",
    experience_min: job.experience_min?.toString() ?? "",
    openings: (job.openings ?? job.headcount ?? 1).toString(),
    required_skills: job.required_skills?.length ? job.required_skills : job.skills ?? [],
    nice_to_have: job.nice_to_have ?? [],
    visa_requirements: job.visa_requirements ?? [],
    client_contact: job.client_contact ?? "",
    client_email: job.client_email ?? "",
    client_phone: job.client_phone ?? "",
    end_client_contact: job.end_client_contact ?? "",
    end_client_email: job.end_client_email ?? "",
    end_client_phone: job.end_client_phone ?? "",
    vendor_name: job.vendor_name ?? "",
    vendor_contact: job.vendor_contact ?? "",
    vendor_email: job.vendor_email ?? "",
    vendor_phone: job.vendor_phone ?? "",
  } : {};

  return (
    <>
      <Shell role="manager" pageTitle="Edit Job">
        <div className="mb-4">
          <Link href={`/manager/jobs/${id}`}>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs -ml-2">
              <ArrowLeftIcon className="size-3.5" /> Back to Job
            </Button>
          </Link>
        </div>
        <div className="max-w-3xl">
          <JobForm mode="internal" initialData={initialData} onSubmit={handleSubmit} submitting={submitting} />
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
