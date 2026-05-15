"use client";

import { useState } from "react";
import { JobForm, type JobFormData } from "@/components/jobs/JobForm";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { CONTRACT_TYPES } from "@/lib/constants";
import { Toaster } from "@/components/ui/sonner";
import { CheckIcon } from "lucide-react";

export default function PostJobPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(data: JobFormData) {
    setSubmitting(true);
    try {
      const isContract = (CONTRACT_TYPES as readonly string[]).includes(data.job_type);
      const payload: Record<string, unknown> = {
        title: data.title,
        job_type: data.job_type,
        work_mode: data.work_mode,
        location: data.location || null,

        description: data.description,
        currency: data.currency,
        required_skills: data.required_skills,
        nice_to_have: data.nice_to_have,
        visa_requirements: data.visa_requirements,
        openings: Number(data.openings) || 1,
        submitter_name: data.submitter_name || null,
        submitter_email: data.submitter_email || null,
        submitter_phone: data.submitter_phone || null,
      };

      if (isContract) {
        payload.end_client_name = data.end_client_name;
        payload.company = data.end_client_name;
        if (data.pay_rate) { payload.pay_rate_min = Number(data.pay_rate); payload.pay_rate_max = Number(data.pay_rate); }
      } else {
        payload.company = data.company;
        if (data.salary) { payload.salary_min = Number(data.salary); payload.salary_max = Number(data.salary); }
      }

      if (data.experience_min) payload.experience_min = Number(data.experience_min);

      await apiFetch("/api/public/jobs", { method: "POST", body: JSON.stringify(payload) });
      setSubmitted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit job");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl border border-border bg-card">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 mx-auto">
            <CheckIcon className="size-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold">Job Submitted!</h2>
          <p className="text-sm text-muted-foreground">
            Your job posting has been received and is pending review. Our team will get back to you shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-3xl px-4 py-5">
            <h1 className="text-base font-semibold">Post a Job</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Fill in the details below and we'll review your posting within 24 hours</p>
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-6">
          <JobForm mode="public" onSubmit={handleSubmit} submitting={submitting} />
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </>
  );
}
