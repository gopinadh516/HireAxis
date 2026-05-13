"use client";

import { useState } from "react";
import { BriefcaseIcon } from "lucide-react";
import { TalentForm, type TalentFormData } from "@/components/talents/TalentForm";
import { apiFetch, apiUpload } from "@/lib/api";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export default function ApplyPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(data: TalentFormData) {
    setSubmitting(true);
    try {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        alt_phone: data.alt_phone || null,
        dob: data.dob || null,
        gender: data.gender || null,
        visa_status: data.visa_status || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || "USA",
        zip_code: data.zip_code || null,
        current_title: data.current_title || null,
        current_company: data.current_company || null,
        total_experience: data.total_experience ? parseFloat(data.total_experience) : null,
        linkedin_url: data.linkedin_url || null,
        portfolio_url: data.portfolio_url || null,
        summary: data.summary || null,
        referred_by: data.referred_by || null,
        skills: data.skills.filter((s) => s.skill.trim()).map((s) => s.skill),
      };

      const created = await apiFetch<{ id: string }>("/api/public/talents", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (data.resumeFile) {
        const fd = new FormData();
        fd.append("file", data.resumeFile);
        await apiUpload(`/api/public/talents/${created.id}/documents`, fd);
      }

      setSubmitted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Minimal header */}
        <header className="flex h-14 items-center gap-2.5 border-b border-border px-6">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <BriefcaseIcon className="size-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">HireAxis</span>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-10">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                <BriefcaseIcon className="size-8 text-emerald-600" />
              </div>
              <h2 className="mt-6 text-xl font-semibold">Application Submitted!</h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-sm">
                Thank you for your interest. Our team will review your application and get back to you shortly.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-xl font-semibold">Apply to Our Talent Pool</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fill in your details below. Our team will review and reach out if there is a match.
                </p>
              </div>
              <TalentForm mode="public" onSubmit={handleSubmit} submitting={submitting} />
            </>
          )}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </>
  );
}
