"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { JobForm, type JobFormData, type Recruiter } from "@/components/jobs/JobForm";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeftIcon } from "lucide-react";
import { CONTRACT_TYPES } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";

export default function NewJobPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);

  useEffect(() => {
    apiFetch<Recruiter[]>("/api/approvals/recruiters").then(setRecruiters).catch(() => {});
  }, []);

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
        source: "manual",
        posted_by_id: user?.id ?? null,
        created_by: user?.id ?? null,

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
        if (data.pay_rate) { payload.pay_rate_min = Number(data.pay_rate); payload.pay_rate_max = Number(data.pay_rate); }
        if (data.bill_rate) { payload.bill_rate_min = Number(data.bill_rate); payload.bill_rate_max = Number(data.bill_rate); }
      } else {
        payload.company = data.company;
        payload.client_name = data.company;
        if (data.salary) { payload.salary_min = Number(data.salary); payload.salary_max = Number(data.salary); }
      }

      if (data.experience_min) payload.experience_min = Number(data.experience_min);

      if (data.recruiter_id) payload.recruiter_id = data.recruiter_id;

      const job = await apiFetch<{ id: string }>("/api/jobs/", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Job posted successfully");
      router.push(`/manager/jobs/${job.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Shell role="manager" pageTitle="Post a Job" pageSubtitle="Fill in the details below">
        <div className="mb-4">
          <Link href="/manager/jobs">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs -ml-2">
              <ArrowLeftIcon className="size-3.5" /> Back to Jobs
            </Button>
          </Link>
        </div>
        <div className="max-w-3xl">
          <JobForm mode="internal" onSubmit={handleSubmit} submitting={submitting} recruiters={recruiters} />
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
