"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { TalentForm, type TalentFormData } from "@/components/talents/TalentForm";
import { apiFetch, apiUpload } from "@/lib/api";
import { toast } from "sonner";

export default function NewTalentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(data: TalentFormData) {
    setSubmitting(true);
    try {
      const skills = data.skills
        .filter((s) => s.skill.trim())
        .map((s) => ({
          skill: s.skill,
          level: s.level || null,
          years_of_exp: s.years_of_exp ? parseFloat(s.years_of_exp) : null,
        }));

      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
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
        skills: skills.map((s) => s.skill),
      };

      const created = await apiFetch<{ id: string }>("/api/talents/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Upload resume if provided
      if (data.resumeFile) {
        const fd = new FormData();
        fd.append("file", data.resumeFile);
        fd.append("doc_type", "RESUME");
        await apiUpload(`/api/talents/${created.id}/documents`, fd);
      }

      // Insert skill rows via a separate call if needed (skills array is stored on talent row)
      toast.success("Talent added successfully");
      router.push(`/recruiter/talents/${created.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create talent");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Shell role="recruiter" pageTitle="Add Talent" pageSubtitle="Add a new talent to the pool">
        <TalentForm mode="create" onSubmit={handleSubmit} submitting={submitting} />
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
