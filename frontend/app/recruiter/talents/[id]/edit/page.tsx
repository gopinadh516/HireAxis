"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { TalentForm, type TalentFormData } from "@/components/talents/TalentForm";
import { useTalent } from "@/hooks/use-talents";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export default function EditTalentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { talent, loading, error } = useTalent(id);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(data: TalentFormData) {
    setSubmitting(true);
    try {
      await apiFetch(`/api/talents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          first_name: data.first_name || null,
          last_name: data.last_name || null,
          email: data.email || null,
          phone: data.phone || null,
          alt_phone: data.alt_phone || null,
          dob: data.dob || null,
          gender: data.gender || null,
          visa_status: data.visa_status || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          zip_code: data.zip_code || null,
          current_title: data.current_title || null,
          current_company: data.current_company || null,
          total_experience: data.total_experience ? parseFloat(data.total_experience) : null,
          linkedin_url: data.linkedin_url || null,
          portfolio_url: data.portfolio_url || null,
          summary: data.summary || null,
          skills: data.skills.filter((s) => s.skill.trim()).map((s) => s.skill),
        }),
      });
      toast.success("Talent updated");
      router.push(`/recruiter/talents/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update talent");
    } finally {
      setSubmitting(false);
    }
  }

  const displayName = talent
    ? talent.first_name
      ? `${talent.first_name} ${talent.last_name ?? ""}`.trim()
      : talent.name
    : "";

  return (
    <>
      <Shell role="recruiter" pageTitle={`Edit — ${displayName}`} pageSubtitle="Update talent profile">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : talent ? (
          <TalentForm
            mode="edit"
            defaultValues={{
              first_name: talent.first_name ?? "",
              last_name: talent.last_name ?? "",
              email: talent.email ?? "",
              phone: talent.phone ?? "",
              alt_phone: talent.alt_phone ?? "",
              dob: talent.dob ?? "",
              gender: talent.gender ?? "",
              visa_status: talent.visa_status ?? "",
              address: talent.address ?? "",
              city: talent.city ?? "",
              state: talent.state ?? "",
              country: talent.country ?? "USA",
              zip_code: talent.zip_code ?? "",
              current_title: talent.current_title ?? "",
              current_company: talent.current_company ?? "",
              total_experience: talent.total_experience != null ? String(talent.total_experience) : "",
              linkedin_url: talent.linkedin_url ?? "",
              portfolio_url: talent.portfolio_url ?? "",
              summary: talent.summary ?? "",
              skills: (talent.talent_skills?.length ?? 0) > 0
                ? talent.talent_skills!.map((s) => ({
                    skill: s.skill,
                    level: s.level ?? "",
                    years_of_exp: s.years_of_exp != null ? String(s.years_of_exp) : "",
                  }))
                : talent.skills.map((s) => ({ skill: s, level: "", years_of_exp: "" })),
            }}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        ) : null}
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
