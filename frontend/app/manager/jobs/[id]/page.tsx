"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/shell";
import { PipelineBar } from "@/components/jobs/PipelineBar";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { JobTypeBadge } from "@/components/jobs/JobTypeBadge";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { CandidateSourcingPanel } from "@/components/jobs/CandidateSourcingPanel";
import { PulsePanel } from "@/components/jobs/PulsePanel";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeftIcon, MapPinIcon, BriefcaseIcon, UsersIcon,
  CalendarIcon, MailIcon, PhoneIcon, UserIcon,
  ToggleLeftIcon, ToggleRightIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon,
  FolderOpenIcon, CheckCircle2Icon, PlusIcon, SaveIcon, ClipboardCheckIcon,
  ChevronRightIcon, MessageCircleIcon,
} from "lucide-react";
import { CONTRACT_TYPES, formatSalary, formatJobId, WORK_MODE_LABELS, VISA_STATUS_LABELS, getUrgency, urgencyDaysLeft, URGENCY_LABEL, URGENCY_CLASS } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import type { Job } from "@/lib/database.types";

interface Recruiter { id: string; name: string; email: string; role: string; }

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobAssignmentRow {
  id: string;
  status: string;
  created_at: string;
  users: { id: string; name: string; email: string } | null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ContactBlock({ label, name, contact, email, phone }: {
  label: string; name?: string | null; contact?: string | null; email?: string | null; phone?: string | null;
}) {
  if (!name && !contact && !email && !phone) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="space-y-1 text-sm">
        {name    && <p className="font-medium">{name}</p>}
        {contact && <p className="text-muted-foreground">{contact}</p>}
        {email   && <a href={`mailto:${email}`} className="text-primary hover:underline flex items-center gap-1.5 text-xs"><MailIcon className="size-3" />{email}</a>}
        {phone   && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><PhoneIcon className="size-3" />{phone}</p>}
      </div>
    </div>
  );
}

const ASSIGNMENT_STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 border-amber-200",
  reviewing: "bg-blue-100 text-blue-700 border-blue-200",
  searching: "bg-violet-100 text-violet-700 border-violet-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// ── Hiring Manager Card ───────────────────────────────────────────────────────

function HiringManagerCard({ job, onSaved }: { job: Job; onSaved: (updated: Partial<Job>) => void }) {
  const isContract = (CONTRACT_TYPES as readonly string[]).includes(job.job_type ?? "");
  const name    = isContract ? job.end_client_contact : job.client_contact;
  const email   = isContract ? job.end_client_email   : job.client_email;
  const phone   = isContract ? job.end_client_phone   : job.client_phone;
  const company = isContract ? job.end_client_name    : job.company;
  const hasDetails = !!(name || email || phone);

  const [collapsed, setCollapsed] = useState(true);
  const [editing, setEditing] = useState(!hasDetails);
  const [form, setForm] = useState({ name: name ?? "", email: email ?? "", phone: phone ?? "" });
  const [sameAsSubmitted, setSameAsSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasSubmittedBy = !!(job.submitted_by_name || job.submitted_by_email || job.submitted_by_phone);

  function handleSameAsSubmitted(checked: boolean) {
    setSameAsSubmitted(checked);
    if (checked) {
      setForm({
        name:  job.submitted_by_name  ?? "",
        email: job.submitted_by_email ?? "",
        phone: job.submitted_by_phone ?? "",
      });
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const patch = isContract
        ? { end_client_contact: form.name || null, end_client_email: form.email || null, end_client_phone: form.phone || null }
        : { client_contact: form.name || null, client_email: form.email || null, client_phone: form.phone || null };
      await apiFetch(`/api/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      onSaved(patch);
      setEditing(false);
      toast.success("Hiring manager details saved");
    } catch {
      toast.error("Failed to save details");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <UserIcon className="size-3.5" /> Hiring Manager
          {collapsed && name && <span className="normal-case tracking-normal font-normal text-foreground">· {name}</span>}
          {collapsed && !hasDetails && <span className="normal-case tracking-normal font-normal text-muted-foreground italic">· not set</span>}
        </span>
        {collapsed ? <ChevronDownIcon className="size-3.5 text-muted-foreground shrink-0" /> : <ChevronUpIcon className="size-3.5 text-muted-foreground shrink-0" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-border">
          <div className="pt-3 flex items-center justify-between">
            <span />
            {hasDetails && !editing && (
              <Button variant="ghost" size="icon" className="size-6" onClick={() => setEditing(true)}>
                <PencilIcon className="size-3" />
              </Button>
            )}
          </div>

          {!editing ? (
            <div className="space-y-1.5 text-sm">
              {company && <p className="text-xs text-muted-foreground">{company}</p>}
              {name  && <p className="font-medium">{name}</p>}
              {email && <a href={`mailto:${email}`} className="text-primary hover:underline flex items-center gap-1.5 text-xs"><MailIcon className="size-3" />{email}</a>}
              {phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><PhoneIcon className="size-3" />{phone}</p>}
            </div>
          ) : (
            <div className="space-y-2.5">
              {hasSubmittedBy && (
                <label className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2">
                  <Checkbox
                    checked={sameAsSubmitted}
                    onCheckedChange={(v) => handleSameAsSubmitted(!!v)}
                  />
                  <span className="text-xs text-primary font-medium">Same as Submitted By</span>
                  {sameAsSubmitted && job.submitted_by_name && (
                    <span className="ml-auto text-[10px] text-muted-foreground truncate">{job.submitted_by_name}</span>
                  )}
                </label>
              )}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Full Name</Label>
                <Input value={form.name} onChange={(e) => { setSameAsSubmitted(false); setForm((f) => ({ ...f, name: e.target.value })); }} placeholder="e.g. John Smith" className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => { setSameAsSubmitted(false); setForm((f) => ({ ...f, email: e.target.value })); }} placeholder="john@company.com" className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Phone</Label>
                <Input value={form.phone} onChange={(e) => { setSameAsSubmitted(false); setForm((f) => ({ ...f, phone: e.target.value })); }} placeholder="+1 555 000 0000" className="h-7 text-xs" />
              </div>
              <div className="flex gap-2 pt-1">
                {hasDetails && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setEditing(false); setSameAsSubmitted(false); setForm({ name: name ?? "", email: email ?? "", phone: phone ?? "" }); }}>
                    Cancel
                  </Button>
                )}
                <Button size="sm" className="h-7 text-xs gap-1.5 flex-1" onClick={handleSave} disabled={saving}>
                  <SaveIcon className="size-3" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}

          {!hasDetails && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <PlusIcon className="size-3" /> Add hiring manager details
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Editable Contact Card (End Client / Vendor) ───────────────────────────────

interface ContactFields {
  name: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
}

function EditableContactCard({ title, fields, patchKeys, jobId, onSaved }: {
  title: string;
  fields: ContactFields;
  patchKeys: { name: string; contact: string; email: string; phone: string };
  jobId: string;
  onSaved: (updated: Partial<Job>) => void;
}) {
  const hasDetails = !!(fields.name || fields.contact || fields.email || fields.phone);
  const [collapsed, setCollapsed] = useState(true);
  const [editing, setEditing] = useState(!hasDetails);
  const [form, setForm] = useState({ name: fields.name ?? "", contact: fields.contact ?? "", email: fields.email ?? "", phone: fields.phone ?? "" });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const patch = {
        [patchKeys.name]:    form.name    || null,
        [patchKeys.contact]: form.contact || null,
        [patchKeys.email]:   form.email   || null,
        [patchKeys.phone]:   form.phone   || null,
      };
      await apiFetch(`/api/jobs/${jobId}`, { method: "PATCH", body: JSON.stringify(patch) });
      onSaved(patch as Partial<Job>);
      setEditing(false);
      toast.success(`${title} details saved`);
    } catch {
      toast.error("Failed to save details");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
          {collapsed && fields.name && <span className="normal-case tracking-normal font-normal text-foreground">· {fields.name}</span>}
          {collapsed && !hasDetails && <span className="normal-case tracking-normal font-normal text-muted-foreground italic">· not set</span>}
        </span>
        {collapsed ? <ChevronDownIcon className="size-3.5 text-muted-foreground shrink-0" /> : <ChevronUpIcon className="size-3.5 text-muted-foreground shrink-0" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-border">
          <div className="pt-3 flex items-center justify-end">
            {hasDetails && !editing && (
              <Button variant="ghost" size="icon" className="size-6" onClick={() => setEditing(true)}>
                <PencilIcon className="size-3" />
              </Button>
            )}
          </div>

          {!editing && hasDetails && (
            <div className="space-y-1.5 text-sm">
              {fields.name    && <p className="font-medium">{fields.name}</p>}
              {fields.contact && <p className="text-muted-foreground text-xs">{fields.contact}</p>}
              {fields.email   && <a href={`mailto:${fields.email}`} className="text-primary hover:underline flex items-center gap-1.5 text-xs"><MailIcon className="size-3" />{fields.email}</a>}
              {fields.phone   && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><PhoneIcon className="size-3" />{fields.phone}</p>}
            </div>
          )}

          {editing && (
            <div className="space-y-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Company Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Acme Corp" className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Contact Person</Label>
                <Input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="Name" className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="contact@company.com" className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" className="h-7 text-xs" />
              </div>
              <div className="flex gap-2 pt-1">
                {hasDetails && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setEditing(false); setForm({ name: fields.name ?? "", contact: fields.contact ?? "", email: fields.email ?? "", phone: fields.phone ?? "" }); }}>
                    Cancel
                  </Button>
                )}
                <Button size="sm" className="h-7 text-xs gap-1.5 flex-1" onClick={handleSave} disabled={saving}>
                  <SaveIcon className="size-3" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}

          {!hasDetails && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <PlusIcon className="size-3" /> Add {title.toLowerCase()} details
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Dates Card ───────────────────────────────────────────────────────────────

function DatesCard({ job, onSaved }: { job: Job; onSaved: (updated: Partial<Job>) => void }) {
  const fmt = (d: string | null) => d ? d.slice(0, 10) : "";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    application_deadline: fmt(job.application_deadline),
    due_date: fmt(job.due_date),
  });
  const [saving, setSaving] = useState(false);

  const hasAny = !!(job.application_deadline || job.due_date);

  async function handleSave() {
    setSaving(true);
    try {
      const patch: Partial<Job> = {
        application_deadline: form.application_deadline || null,
        due_date: form.due_date || null,
      };
      await apiFetch(`/api/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      onSaved(patch);
      setEditing(false);
      toast.success("Dates saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save dates");
    } finally {
      setSaving(false);
    }
  }

  const display = (d: string | null, label: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <CalendarIcon className="size-3.5" /> Dates
        </p>
        {!editing && (
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setEditing(true)}>
            <PencilIcon className="size-3" />
          </Button>
        )}
      </div>

      {!editing ? (
        <div className="space-y-2 text-sm">
          {job.application_deadline ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground w-36 shrink-0">Application Deadline</span>
              <span className="text-xs font-medium">{display(job.application_deadline, "")}</span>
              {(() => {
                const u = getUrgency(job.application_deadline);
                const d = urgencyDaysLeft(job.application_deadline);
                if (!u) return null;
                return (
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${URGENCY_CLASS[u]}`}>
                    {d === 0 ? "Due today" : d === 1 ? "1 day left" : `${d} days left · ${URGENCY_LABEL[u]}`}
                  </span>
                );
              })()}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No dates set</p>
          )}
          {job.due_date && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-36 shrink-0">Due Date (internal)</span>
              <span className="text-xs font-medium">{display(job.due_date, "")}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Application Deadline</Label>
            <Input
              type="date"
              value={form.application_deadline}
              onChange={(e) => setForm((f) => ({ ...f, application_deadline: e.target.value }))}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Due Date <span className="font-normal">(internal)</span></Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-7 text-xs"
              onClick={() => { setEditing(false); setForm({ application_deadline: fmt(job.application_deadline), due_date: fmt(job.due_date) }); }}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1.5 flex-1" onClick={handleSave} disabled={saving}>
              <SaveIcon className="size-3" /> {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Client & Vendor Card ──────────────────────────────────────────────────────

type SectionKey = "client" | "vendor";

function ClientVendorCard({ job, jobId, isContract, onSaved }: {
  job: Job; jobId: string; isContract: boolean;
  onSaved: (updated: Partial<Job>) => void;
}) {
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);

  const clientFields = isContract
    ? { name: job.end_client_name, contact: job.end_client_contact, email: job.end_client_email, phone: job.end_client_phone }
    : { name: job.company, contact: job.client_contact, email: job.client_email, phone: job.client_phone };

  const vendorFields = { name: job.vendor_name, contact: job.vendor_contact, email: job.vendor_email, phone: job.vendor_phone };

  const [clientForm, setClientForm] = useState({ name: clientFields.name ?? "", contact: clientFields.contact ?? "", email: clientFields.email ?? "", phone: clientFields.phone ?? "" });
  const [vendorForm, setVendorForm] = useState({ name: vendorFields.name ?? "", contact: vendorFields.contact ?? "", email: vendorFields.email ?? "", phone: vendorFields.phone ?? "" });

  async function save(section: SectionKey) {
    setSaving(true);
    try {
      let patch: Partial<Job>;
      if (section === "client") {
        patch = isContract
          ? { end_client_name: clientForm.name || null, end_client_contact: clientForm.contact || null, end_client_email: clientForm.email || null, end_client_phone: clientForm.phone || null }
          : { company: clientForm.name || null, client_contact: clientForm.contact || null, client_email: clientForm.email || null, client_phone: clientForm.phone || null };
      } else {
        patch = { vendor_name: vendorForm.name || null, vendor_contact: vendorForm.contact || null, vendor_email: vendorForm.email || null, vendor_phone: vendorForm.phone || null };
      }
      await apiFetch(`/api/jobs/${jobId}`, { method: "PATCH", body: JSON.stringify(patch) });
      onSaved(patch);
      setEditing(null);
      toast.success(`${section === "client" ? "Client" : "Vendor"} details saved`);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  function ContactRow({ label, value, href }: { label: string; value: string | null; href?: string }) {
    if (!value) return null;
    return (
      <div className="flex items-start gap-1.5">
        <span className="text-[10px] text-muted-foreground w-14 shrink-0 pt-0.5">{label}</span>
        {href
          ? <a href={href} className="text-xs text-primary hover:underline break-all">{value}</a>
          : <span className="text-xs font-medium">{value}</span>}
      </div>
    );
  }

  function SectionView({ label, fields, section }: { label: string; fields: typeof clientFields; section: SectionKey }) {
    const hasAny = !!(fields.name || fields.contact || fields.email || fields.phone);
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <Button variant="ghost" size="icon" className="size-5 shrink-0" onClick={() => setEditing(editing === section ? null : section)}>
            <PencilIcon className="size-2.5" />
          </Button>
        </div>
        {!hasAny && editing !== section && (
          <p className="text-xs text-muted-foreground italic">Not set</p>
        )}
        {hasAny && editing !== section && (
          <div className="space-y-1">
            <ContactRow label="Company" value={fields.name} />
            <ContactRow label="Contact" value={fields.contact} />
            <ContactRow label="Email" value={fields.email} href={fields.email ? `mailto:${fields.email}` : undefined} />
            <ContactRow label="Phone" value={fields.phone} />
          </div>
        )}
        {editing === section && (
          <div className="space-y-2 pt-1">
            {[
              { lbl: "Company", key: "name", type: "text", ph: section === "vendor" ? "TechStaff LLC" : "BigBank Inc" },
              { lbl: "Contact", key: "contact", type: "text", ph: "Jane Smith" },
              { lbl: "Email", key: "email", type: "email", ph: "jane@company.com" },
              { lbl: "Phone", key: "phone", type: "tel", ph: "+1 555 000 0000" },
            ].map(({ lbl, key, type, ph }) => (
              <div key={key} className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">{lbl}</Label>
                <Input
                  type={type}
                  value={section === "client" ? clientForm[key as keyof typeof clientForm] : vendorForm[key as keyof typeof vendorForm]}
                  onChange={(e) => section === "client"
                    ? setClientForm((f) => ({ ...f, [key]: e.target.value }))
                    : setVendorForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph}
                  className="h-6 text-xs"
                />
              </div>
            ))}
            <div className="flex gap-1.5 pt-1">
              <Button variant="outline" size="sm" className="h-6 text-[11px]" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" className="h-6 text-[11px] gap-1 flex-1" onClick={() => save(section)} disabled={saving}>
                <SaveIcon className="size-2.5" />{saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client & Vendor</p>
      <SectionView label={isContract ? "End Client" : "Client"} fields={clientFields} section="client" />
      <div className="border-t border-border" />
      <SectionView label="Vendor / MSP" fields={vendorFields} section="vendor" />
    </div>
  );
}

// ── Details Card ─────────────────────────────────────────────────────────────

function DetailsCard({ job, isContract, salaryText, expText, onSaved }: {
  job: Job; isContract: boolean; salaryText: string | null; expText: string | null;
  onSaved: (updated: Partial<Job>) => void;
}) {
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineVal, setDeadlineVal] = useState(job.application_deadline?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  async function saveDeadline() {
    setSaving(true);
    try {
      await apiFetch(`/api/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify({ application_deadline: deadlineVal || null }) });
      onSaved({ application_deadline: deadlineVal || null });
      setEditingDeadline(false);
      toast.success("Deadline saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  const urgency = job.application_deadline ? getUrgency(job.application_deadline) : null;
  const daysLeft = job.application_deadline ? urgencyDaysLeft(job.application_deadline) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
      <dl className="space-y-2 text-sm">
        {job.location && (
          <div className="flex items-center gap-2"><MapPinIcon className="size-3.5 text-muted-foreground shrink-0" /><span>{job.location}</span></div>
        )}
        {job.work_mode && (
          <div className="flex items-center gap-2"><BriefcaseIcon className="size-3.5 text-muted-foreground shrink-0" /><span>{WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}</span></div>
        )}
        <div className="flex items-center gap-2"><UsersIcon className="size-3.5 text-muted-foreground shrink-0" /><span>{job.openings ?? job.headcount} opening{(job.openings ?? job.headcount) !== 1 ? "s" : ""}</span></div>
        {salaryText && <div className="flex items-center gap-2"><span className="size-3.5 text-muted-foreground shrink-0">$</span><span>{salaryText}</span></div>}
        {expText && <div className="flex items-center gap-2"><BriefcaseIcon className="size-3.5 text-muted-foreground shrink-0" /><span>{expText}</span></div>}

        {/* Application Deadline — editable */}
        <div className="flex items-start gap-2 pt-1 border-t border-border">
          <CalendarIcon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs text-muted-foreground">Application Deadline</p>
              {!editingDeadline && (
                <Button variant="ghost" size="icon" className="size-5 shrink-0"
                  onClick={() => { setDeadlineVal(job.application_deadline?.slice(0, 10) ?? ""); setEditingDeadline(true); }}>
                  <PencilIcon className="size-2.5" />
                </Button>
              )}
            </div>
            {editingDeadline ? (
              <div className="flex items-center gap-1.5 mt-1">
                <Input type="date" value={deadlineVal} onChange={(e) => setDeadlineVal(e.target.value)} className="h-6 text-xs flex-1" />
                <Button size="icon" className="size-6 shrink-0" onClick={saveDeadline} disabled={saving}><SaveIcon className="size-2.5" /></Button>
                <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => setEditingDeadline(false)}>
                  <span className="text-[10px] leading-none">✕</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <p className="text-sm font-medium">
                  {fmtDate(job.application_deadline) ?? <span className="text-xs text-muted-foreground italic font-normal">Not set</span>}
                </p>
                {urgency && urgency !== "low" && daysLeft != null && (
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${URGENCY_CLASS[urgency]}`}>
                    {daysLeft === 0 ? "Due today" : daysLeft === 1 ? "1 day left" : `${daysLeft}d · ${URGENCY_LABEL[urgency]}`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {isContract && (job.bill_rate_min != null || job.bill_rate_max != null) && (
          <div className="flex items-start gap-2 pt-1 border-t border-border">
            <span className="size-3.5 text-muted-foreground shrink-0 mt-0.5">$</span>
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Customer Bill Rate</p>
              <p className="text-sm font-medium">
                {job.bill_rate_min != null && job.bill_rate_max != null && job.bill_rate_min !== job.bill_rate_max
                  ? `$${job.bill_rate_min}–$${job.bill_rate_max}/hr`
                  : `$${job.bill_rate_min ?? job.bill_rate_max}/hr`}
              </p>
            </div>
          </div>
        )}
        {isContract && job.internal_bill_rate != null && (
          <div className="flex items-start gap-2">
            <span className="size-3.5 text-muted-foreground shrink-0 mt-0.5">$</span>
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Bytesoftware Bill Rate</p>
              <p className="text-sm font-medium">${job.internal_bill_rate}/hr</p>
            </div>
          </div>
        )}

        {/* Submitted By — read only */}
        {(job.submitted_by_name || job.submitted_by_email) && (
          <div className="flex items-start gap-2 pt-1 border-t border-border">
            <UserIcon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Submitted By</p>
              {job.submitted_by_name && <p className="text-sm font-medium">{job.submitted_by_name}</p>}
              {job.submitted_by_email && <p className="text-xs text-muted-foreground">{job.submitted_by_email}</p>}
              {job.submitted_by_phone && <p className="text-xs text-muted-foreground">{job.submitted_by_phone}</p>}
            </div>
          </div>
        )}

        {/* Hiring Manager — read only */}
        {(() => {
          const hmName  = isContract ? job.end_client_contact : job.client_contact;
          const hmEmail = isContract ? job.end_client_email   : job.client_email;
          const hmPhone = isContract ? job.end_client_phone   : job.client_phone;
          if (!hmName && !hmEmail) return null;
          return (
            <div className="flex items-start gap-2 pt-1 border-t border-border">
              <UserIcon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Hiring Manager</p>
                {hmName  && <p className="text-sm font-medium">{hmName}</p>}
                {hmEmail && <p className="text-xs text-muted-foreground">{hmEmail}</p>}
                {hmPhone && <p className="text-xs text-muted-foreground">{hmPhone}</p>}
              </div>
            </div>
          );
        })()}

        {/* Visa Requirements */}
        {job.visa_requirements?.length > 0 && (
          <div className="pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1.5">Visa Requirements</p>
            <div className="flex flex-wrap gap-1">
              {job.visa_requirements.map((v) => (
                <span key={v} className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[11px] font-medium">
                  {VISA_STATUS_LABELS[v] ?? v}
                </span>
              ))}
            </div>
          </div>
        )}
      </dl>
    </div>
  );
}

// ── Submitted By Card ─────────────────────────────────────────────────────────

function SubmittedByCard({ job, onSaved }: { job: Job; onSaved: (updated: Partial<Job>) => void }) {
  const hasDetails = !!(job.submitted_by_name || job.submitted_by_email || job.submitted_by_phone);
  const [collapsed, setCollapsed] = useState(true);
  const [editing, setEditing] = useState(!hasDetails);
  const [form, setForm] = useState({
    name:  job.submitted_by_name  ?? "",
    email: job.submitted_by_email ?? "",
    phone: job.submitted_by_phone ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const patch = {
        submitted_by_name:  form.name  || null,
        submitted_by_email: form.email || null,
        submitted_by_phone: form.phone || null,
      };
      await apiFetch(`/api/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      onSaved(patch);
      setEditing(false);
      toast.success("Submitter details saved");
    } catch {
      toast.error("Failed to save details");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <UserIcon className="size-3.5" /> Submitted By
          {collapsed && job.submitted_by_name && (
            <span className="normal-case tracking-normal font-normal text-foreground">· {job.submitted_by_name}</span>
          )}
          {collapsed && !hasDetails && (
            <span className="normal-case tracking-normal font-normal text-muted-foreground italic">· not set</span>
          )}
        </span>
        {collapsed
          ? <ChevronDownIcon className="size-3.5 text-muted-foreground shrink-0" />
          : <ChevronUpIcon className="size-3.5 text-muted-foreground shrink-0" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 border-t border-border space-y-3">
          <div className="pt-3 flex items-center justify-between">
            <span />
            {hasDetails && !editing && (
              <Button variant="ghost" size="icon" className="size-6" onClick={() => setEditing(true)}>
                <PencilIcon className="size-3" />
              </Button>
            )}
          </div>

          {!editing && hasDetails && (
            <div className="space-y-1.5 text-sm">
              {job.submitted_by_name  && <p className="font-medium">{job.submitted_by_name}</p>}
              {job.submitted_by_email && (
                <a href={`mailto:${job.submitted_by_email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <MailIcon className="size-3" />{job.submitted_by_email}
                </a>
              )}
              {job.submitted_by_phone && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PhoneIcon className="size-3" />{job.submitted_by_phone}
                </p>
              )}
            </div>
          )}

          {editing && (
            <div className="space-y-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Full Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ravi Kumar" className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="ravi@company.com" className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Mobile</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" className="h-7 text-xs" />
              </div>
              <div className="flex gap-2 pt-1">
                {hasDetails && (
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => { setEditing(false); setForm({ name: job.submitted_by_name ?? "", email: job.submitted_by_email ?? "", phone: job.submitted_by_phone ?? "" }); }}>
                    Cancel
                  </Button>
                )}
                <Button size="sm" className="h-7 text-xs gap-1.5 flex-1" onClick={handleSave} disabled={saving}>
                  <SaveIcon className="size-3" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}

          {!hasDetails && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <PlusIcon className="size-3" /> Add submitter details
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bill Rate Card ────────────────────────────────────────────────────────────

function BillRateCard({ job, onSaved }: { job: Job; onSaved: (updated: Partial<Job>) => void }) {
  // Prefer min (lowest) of any range received from source
  const sourceRate = job.bill_rate_min ?? job.bill_rate_max ?? null;
  const [collapsed, setCollapsed] = useState(true);
  const [customerRateInput, setCustomerRateInput] = useState(
    sourceRate != null ? String(sourceRate) : ""
  );
  const [saving, setSaving] = useState(false);

  const customerRate = parseFloat(customerRateInput) || null;
  const maxSlider = customerRate ?? 200;
  const [billRate, setBillRate] = useState<number>(
    job.internal_bill_rate ?? (sourceRate != null ? Math.round(sourceRate * 0.85 * 100) / 100 : 0)
  );

  const clampedBillRate = Math.min(billRate, maxSlider);

  function handleCustomerRateChange(val: string) {
    setCustomerRateInput(val);
    const r = parseFloat(val);
    if (r > 0) setBillRate(Math.round(r * 0.85 * 100) / 100);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const patch: Partial<Job> = {
        internal_bill_rate: clampedBillRate,
        bill_rate_margin: customerRate ? Math.round((1 - clampedBillRate / customerRate) * 100 * 100) / 100 : null,
        ...(customerRate != null ? { bill_rate_min: customerRate, bill_rate_max: customerRate } : {}),
      };
      await apiFetch(`/api/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      onSaved(patch);
      toast.success("Bill rate saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save bill rate");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Bill Rate
          {collapsed && job.internal_bill_rate != null
            ? <span className="normal-case tracking-normal font-normal text-primary">· ${job.internal_bill_rate}/hr</span>
            : collapsed && <span className="normal-case tracking-normal font-normal text-muted-foreground italic">· not set</span>
          }
        </span>
        {collapsed ? <ChevronDownIcon className="size-3.5 text-muted-foreground shrink-0" /> : <ChevronUpIcon className="size-3.5 text-muted-foreground shrink-0" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Customer Bill Rate — always editable, pre-filled with lowest parsed rate */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Customer Bill Rate</span>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                value={customerRateInput}
                onChange={(e) => handleCustomerRateChange(e.target.value)}
                placeholder="e.g. 100"
                className="h-7 w-24 text-xs text-right"
              />
              <span className="text-xs text-muted-foreground">/hr</span>
            </div>
          </div>

          {/* Bill Rate slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Bill Rate</span>
              <span className="text-sm font-bold text-primary">${clampedBillRate}/hr</span>
            </div>
            <Slider
              min={0}
              max={maxSlider}
              step={0.5}
              value={[clampedBillRate]}
              onValueChange={(vals) => { const v = Array.isArray(vals) ? vals[0] : vals; setBillRate(Math.round((v ?? 0) * 100) / 100); }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>$0</span>
              <span>${maxSlider}/hr</span>
            </div>
          </div>

          {customerRate != null && (
            <p className="text-[10px] text-muted-foreground">
              Margin: {Math.round((1 - clampedBillRate / customerRate) * 100)}% — recruiter sees only the Bill Rate.
            </p>
          )}

          <Button
            size="sm"
            className="h-7 w-full text-xs gap-1.5"
            onClick={handleSave}
            disabled={saving || customerRate == null}
          >
            <SaveIcon className="size-3" /> {saving ? "Saving…" : "Save Rate"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Assign To (adhoc action) ──────────────────────────────────────────────────

function AssignToAction({
  jobId,
  currentAssignment,
  onAssigned,
}: {
  jobId: string;
  currentAssignment: JobAssignmentRow | undefined;
  onAssigned: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState<Recruiter[]>([]);
  const [managerId, setManagerId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiFetch<Recruiter[]>("/api/approvals/recruiters")
      .then((all) => setManagers(all.filter((r) => r.role === "manager")))
      .catch(() => {});
  }, [open]);

  async function handleAssign() {
    if (!managerId || !user) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/jobs/${jobId}/assign-validator`, {
        method: "POST",
        body: JSON.stringify({ manager_id: managerId, assigned_by: user.id }),
      });
      const name = managerId === user.id
        ? user.name
        : managers.find((m) => m.id === managerId)?.name ?? "manager";
      toast.success(`Assigned to ${name}`);
      setOpen(false);
      setManagerId("");
      onAssigned();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <UserIcon className="size-3.5" /> Assign To
          {!open && currentAssignment?.users?.name && (
            <span className="normal-case tracking-normal font-normal text-foreground">
              · {currentAssignment.users.name}
            </span>
          )}
          {!open && !currentAssignment && (
            <span className="normal-case tracking-normal font-normal text-muted-foreground italic">· not assigned</span>
          )}
        </span>
        {open
          ? <ChevronUpIcon className="size-3.5 text-muted-foreground shrink-0" />
          : <ChevronDownIcon className="size-3.5 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
          {currentAssignment?.users?.name && (
            <p className="text-xs text-muted-foreground">
              Currently assigned to <span className="font-medium text-foreground">{currentAssignment.users.name}</span>
            </p>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground">Manager</Label>
              {user && managerId !== user.id && (
                <button
                  type="button"
                  className="text-[10px] text-primary hover:underline font-medium"
                  onClick={() => setManagerId(user.id)}
                >
                  Assign to self
                </button>
              )}
            </div>
            <Select value={managerId} onValueChange={(v) => setManagerId(v ?? "")}>
              <SelectTrigger className="h-8 text-xs">
                {managerId
                  ? <span>{managerId === user?.id ? `${user?.name} (me)` : managers.find((m) => m.id === managerId)?.name}</span>
                  : <SelectValue placeholder="Select manager…" />}
              </SelectTrigger>
              <SelectContent>
                {user && (
                  <SelectItem value={user.id}>
                    <div>
                      <p className="text-xs font-medium">{user.name} <span className="text-muted-foreground font-normal">(me)</span></p>
                      <p className="text-[10px] text-muted-foreground">{user.email}</p>
                    </div>
                  </SelectItem>
                )}
                {managers.filter((m) => m.id !== user?.id).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div>
                      <p className="text-xs font-medium">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.email}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setOpen(false); setManagerId(""); }}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs flex-1 gap-1.5" onClick={handleAssign} disabled={submitting || !managerId}>
              <UserIcon className="size-3" />
              {submitting ? "Assigning…" : currentAssignment ? "Reassign" : "Assign"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function InitiateCasePanel({ job, onSuccess }: { job: Job; onSuccess: (caseId: string) => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<"contact" | "assign">("contact");
  const [contactNotes, setContactNotes] = useState("");
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [recruiterId, setRecruiterId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isContract = (CONTRACT_TYPES as readonly string[]).includes(job.job_type ?? "");
  const hmName  = isContract ? job.end_client_contact : job.client_contact;
  const hmEmail = isContract ? job.end_client_email   : job.client_email;
  const hmPhone = isContract ? job.end_client_phone   : job.client_phone;

  const emailHref = hmEmail
    ? `mailto:${hmEmail}?subject=${encodeURIComponent(`Job Validation: ${job.title ?? ""}`)}&body=${encodeURIComponent(`Hi ${hmName ?? ""},\n\nI would like to discuss the job requirement "${job.title ?? ""}".\n\nPlease let me know a convenient time.\n\nBest regards`)}`
    : null;
  const whatsappHref = hmPhone
    ? `https://wa.me/${hmPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${hmName ?? ""}, I'd like to discuss the job requirement "${job.title ?? ""}". When would be a good time to connect?`)}`
    : null;

  const existingCustomerRate = job.bill_rate_min ?? job.bill_rate_max ?? null;
  const [customerRateInput, setCustomerRateInput] = useState(
    existingCustomerRate != null ? String(existingCustomerRate) : ""
  );
  const customerRate = parseFloat(customerRateInput) || null;
  const maxSlider = customerRate ?? 200;
  const [billRateValue, setBillRateValue] = useState<number>(
    job.internal_bill_rate ?? (existingCustomerRate != null ? Math.round(existingCustomerRate * 0.85 * 100) / 100 : 0)
  );
  const clampedBillRate = Math.min(billRateValue, maxSlider);
  const margin = customerRate ? Math.round((1 - clampedBillRate / customerRate) * 100 * 100) / 100 : 15;

  const billRateReady = !isContract || (customerRate != null && clampedBillRate > 0);

  useEffect(() => {
    apiFetch<Recruiter[]>("/api/approvals/recruiters").then(setRecruiters).catch(() => {});
  }, []);

  async function handleInitiate() {
    if (!recruiterId) { toast.error("Please select a recruiter"); return; }
    if (isContract && !billRateReady) { toast.error("Please set the Bill Rate before initiating"); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ case_id: string }>(`/api/jobs/${job.id}/initiate-case`, {
        method: "POST",
        body: JSON.stringify({
          recruiter_id: recruiterId,
          bill_rate_margin: margin,
          internal_bill_rate: clampedBillRate,
          ...(customerRate != null ? { bill_rate_min: customerRate, bill_rate_max: customerRate } : {}),
        }),
      });
      const recruiter = recruiters.find((r) => r.id === recruiterId);
      toast.success(`Case ${res.case_id} initiated${recruiter ? ` — assigned to ${recruiter.name}` : ""}`);
      onSuccess(res.case_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to initiate case");
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    { key: "contact", label: "Contact HM" },
    { key: "assign",  label: "Assign & Proceed" },
  ];

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
      {/* Header + step pills */}
      <div className="flex items-center gap-2">
        <FolderOpenIcon className="size-4 text-primary shrink-0" />
        <p className="text-sm font-semibold text-primary">Validate Job</p>
      </div>
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border
              ${step === s.key
                ? "bg-primary text-primary-foreground border-primary"
                : step === "assign" && s.key === "contact"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-muted text-muted-foreground border-border"}`}>
              {step === "assign" && s.key === "contact" && <CheckCircle2Icon className="size-2.5" />}
              {s.label}
            </span>
            {i < steps.length - 1 && <ChevronRightIcon className="size-3 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Contact Hiring Manager ── */}
      {step === "contact" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserIcon className="size-3.5" /> Hiring Manager
            </p>
            {hmName || hmEmail || hmPhone ? (
              <>
                {hmName  && <p className="text-sm font-medium">{hmName}</p>}
                {hmEmail && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MailIcon className="size-3 shrink-0" />{hmEmail}</div>}
                {hmPhone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><PhoneIcon className="size-3 shrink-0" />{hmPhone}</div>}
                <div className="flex gap-2 pt-1">
                  {emailHref && (
                    <a href={emailHref} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors">
                      <MailIcon className="size-3 text-blue-500" /> Send Email
                    </a>
                  )}
                  {whatsappHref && (
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors">
                      <MessageCircleIcon className="size-3 text-emerald-500" /> WhatsApp
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">No hiring manager details on file. Please update the job record first.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Contact Notes <span className="text-destructive">*</span></Label>
            <Textarea
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder="Summarise the conversation — requirements confirmed, changes requested, key details noted…"
              className="min-h-[90px] text-xs resize-none"
            />
          </div>

          <Button size="sm" className="w-full h-8 text-xs gap-1.5" disabled={!contactNotes.trim()} onClick={() => setStep("assign")}>
            Next — Assign Recruiter <ChevronRightIcon className="size-3.5" />
          </Button>
        </div>
      )}

      {/* ── Step 2: Bill Rate + Assign ── */}
      {step === "assign" && (
        <div className="space-y-4">
          {isContract && (
            <div className={`rounded-lg border bg-card p-3 space-y-3 ${!billRateReady ? "border-destructive/50" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bill Rate <span className="text-destructive">*</span></p>
                {!billRateReady && <span className="text-[10px] text-destructive font-medium">Required</span>}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">Customer Bill Rate</span>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number" min={0} value={customerRateInput} placeholder="e.g. 100"
                    className="h-7 w-24 text-xs text-right"
                    onChange={(e) => {
                      setCustomerRateInput(e.target.value);
                      const r = parseFloat(e.target.value);
                      if (r > 0) setBillRateValue(Math.round(r * 0.85 * 100) / 100);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">/hr</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Bytesoftware Bill Rate</span>
                  <span className="text-sm font-bold text-primary">{customerRate != null ? `$${clampedBillRate}/hr` : "—"}</span>
                </div>
                <Slider
                  min={0} max={maxSlider} step={0.5} value={[clampedBillRate]} disabled={customerRate == null} className="w-full"
                  onValueChange={(vals) => setBillRateValue(Math.round((Array.isArray(vals) ? (vals[0] ?? 0) : vals) * 100) / 100)}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>$0</span><span>${maxSlider}/hr</span></div>
              </div>
              {customerRate != null && (
                <p className="text-[10px] text-muted-foreground">Margin: {Math.round(margin)}% — recruiter will only see the Bill Rate.</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Assign To <span className="text-destructive">*</span></Label>
              {user && recruiterId !== user.id && (
                <button type="button" className="text-[10px] text-primary hover:underline font-medium" onClick={() => setRecruiterId(user.id)}>
                  Assign to self
                </button>
              )}
            </div>
            <Select value={recruiterId} onValueChange={(v) => setRecruiterId(v ?? "")}>
              <SelectTrigger className="h-8 text-xs">
                {recruiterId
                  ? <span>{recruiterId === user?.id ? `${user?.name} (me)` : recruiters.find((r) => r.id === recruiterId)?.name ?? "Selected"}</span>
                  : <SelectValue placeholder="Select person…" />}
              </SelectTrigger>
              <SelectContent>
                {user && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Self</div>
                    <SelectItem value={user.id}>
                      <div>
                        <p className="text-xs font-medium">{user.name} <span className="text-muted-foreground font-normal">(me)</span></p>
                        <p className="text-[10px] text-muted-foreground">{user.email}</p>
                      </div>
                    </SelectItem>
                  </>
                )}
                {recruiters.filter((r) => r.role === "manager" && r.id !== user?.id).length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t mt-1 pt-2">Managers</div>
                    {recruiters.filter((r) => r.role === "manager" && r.id !== user?.id).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <div><p className="text-xs font-medium">{r.name}</p><p className="text-[10px] text-muted-foreground">{r.email}</p></div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {recruiters.filter((r) => r.role === "recruiter").length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t mt-1 pt-2">Recruiters</div>
                    {recruiters.filter((r) => r.role === "recruiter").map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <div><p className="text-xs font-medium">{r.name}</p><p className="text-[10px] text-muted-foreground">{r.email}</p></div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setStep("contact")}>Back</Button>
            <Button size="sm" className="h-8 text-xs flex-1 gap-1.5" onClick={handleInitiate} disabled={submitting || !recruiterId || !billRateReady}>
              <FolderOpenIcon className="size-3.5" />{submitting ? "Processing…" : "Proceed"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [assignments, setAssignments] = useState<JobAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validatedWithHM, setValidatedWithHM] = useState(false);
  const [contactVendorOpen, setContactVendorOpen] = useState(false);
  const [vendorEmailSubject, setVendorEmailSubject] = useState("");
  const [vendorEmailBody, setVendorEmailBody] = useState("");
  const [vendorWhatsAppMsg, setVendorWhatsAppMsg] = useState("");
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Job>(`/api/jobs/${id}`),
      apiFetch<JobAssignmentRow[]>(`/api/jobs/${id}/assignments`),
    ])
      .then(([j, a]) => { setJob(j); setAssignments(a); })
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [id]);

  function handleCaseInitiated(caseId: string) {
    setJob((j) => j ? { ...j, case_id: caseId, status: "active", job_status: "OPEN", approval_status: "APPROVED", pipeline_stage: "search" } : j);
    apiFetch<JobAssignmentRow[]>(`/api/jobs/${id}/assignments`).then(setAssignments).catch(() => {});
    router.push(`/manager/jobs/${id}/search`);
  }

  function handleJobUpdate(patch: Partial<Job>) {
    setJob((j) => j ? { ...j, ...patch } : j);
  }

  async function handleStartValidation() {
    if (!job) return;
    setValidating(true);
    try {
      await apiFetch(`/api/jobs/${id}/start-validation`, { method: "PATCH" });
      await apiFetch(`/api/jobs/${id}/initiate-case`, {
        method: "POST",
        body: JSON.stringify({ bill_rate_margin: 15 }),
      });
      toast.success("Job validated — moving to Search");
      router.push(`/manager/jobs/${id}/search`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start validation");
      setValidating(false);
    }
  }

  async function handleToggle() {
    if (!job) return;
    setToggling(true);
    try {
      const res = await apiFetch<{ is_active: boolean }>(`/api/jobs/${id}/toggle`, { method: "PATCH" });
      setJob((j) => j ? { ...j, is_active: res.is_active } : j);
      toast.success(res.is_active ? "Job activated" : "Job deactivated");
    } catch {
      toast.error("Failed to toggle");
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <Shell role="manager" pageTitle="Job Detail">
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      </Shell>
    );
  }

  if (!job) {
    return (
      <Shell role="manager" pageTitle="Job Not Found">
        <p className="text-sm text-muted-foreground">This job could not be loaded.</p>
      </Shell>
    );
  }

  const isContract = (CONTRACT_TYPES as readonly string[]).includes(job.job_type ?? "");
  const salaryText = !isContract
    ? formatSalary(job.salary_min, job.salary_max, job.currency, "/yr")
    : formatSalary(job.pay_rate_min, job.pay_rate_max, job.currency, "/hr");

  const expText = job.experience_min != null && job.experience_max != null
    ? `${job.experience_min}–${job.experience_max} years`
    : job.experience_min != null ? `${job.experience_min}+ years`
    : job.experience_max != null ? `Up to ${job.experience_max} years`
    : null;

  const displaySkills = job.required_skills?.length ? job.required_skills : job.skills;
  const jobStatus = job.job_status ?? (job.status === "active" ? "OPEN" : job.status === "closed" ? "CLOSED" : "NEW");

  const descLines = job.description?.split("\n") ?? [];
  const isLongDesc = descLines.length > 8 || (job.description?.length ?? 0) > 600;

  return (
    <>
      <Shell role="manager" pageTitle={job.title} pageSubtitle={formatJobId(job)}>
        <div className="mb-4 flex items-center justify-between">
          <Link href="/manager/jobs">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs -ml-2">
              <ArrowLeftIcon className="size-3.5" /> Back to Jobs
            </Button>
          </Link>
          <Link href={`/manager/jobs/${id}/edit`}>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <PencilIcon className="size-3.5" /> Edit
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Left column ── */}
          <div className="space-y-4">

            {/* Header card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground tracking-widest select-all">
                {formatJobId(job)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <JobTypeBadge type={job.job_type} />
                <JobStatusBadge status={jobStatus} />
                {job.case_id && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                    <FolderOpenIcon className="size-3" /> {job.case_id}
                  </span>
                )}
                {(() => {
                  const u = getUrgency(job.application_deadline);
                  const d = urgencyDaysLeft(job.application_deadline);
                  if (!u || u === "low") return null;
                  return (
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${URGENCY_CLASS[u]}`}>
                      {d === 0 ? "Due today" : `${d}d left · ${URGENCY_LABEL[u]}`}
                    </span>
                  );
                })()}
              </div>
              <h2 className="text-base font-semibold">{job.title}</h2>
              <p className="text-sm text-muted-foreground">{job.company ?? job.end_client_name}</p>
            </div>

            {/* Details */}
            <DetailsCard job={job} isContract={isContract} salaryText={salaryText} expText={expText} onSaved={handleJobUpdate} />

            {/* Description + Skills */}
            {(job.description || displaySkills.length > 0) && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                {job.description && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Job Description</p>
                    <div className={isLongDesc && !descExpanded ? "line-clamp-5" : ""}>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description}</p>
                    </div>
                    {isLongDesc && (
                      <button
                        type="button"
                        onClick={() => setDescExpanded((v) => !v)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {descExpanded ? <><ChevronUpIcon className="size-3" /> Show less</> : <><ChevronDownIcon className="size-3" /> Show more</>}
                      </button>
                    )}
                  </>
                )}
                {displaySkills.length > 0 && (
                  <>
                    {job.description && <div className="border-t border-border" />}
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Required Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {displaySkills.map((s) => (
                        <span key={s} className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">{s}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bill Rate — contract jobs only */}
            {isContract && <BillRateCard job={job} onSaved={handleJobUpdate} />}

            {/* Client & Vendor — combined tile */}
            <ClientVendorCard job={job} jobId={id} isContract={isContract} onSaved={handleJobUpdate} />

            {/* Assignment info */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserIcon className="size-3.5" /> Assigned Recruiter
              </p>
              {assignments.filter((a) => a.status !== "reviewing").length === 0 ? (
                <p className="text-xs text-muted-foreground">Not yet assigned to a recruiter.</p>
              ) : (
                <div className="space-y-2">
                  {assignments.filter((a) => a.status !== "reviewing").map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{a.users?.name ?? "—"}</p>
                        {a.users?.email && <p className="text-xs text-muted-foreground">{a.users.email}</p>}
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${ASSIGNMENT_STATUS_COLORS[a.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign To — adhoc action to assign to a manager for review */}
            <AssignToAction
              jobId={id}
              currentAssignment={assignments.find((a) => a.status === "reviewing")}
              onAssigned={() => apiFetch<JobAssignmentRow[]>(`/api/jobs/${id}/assignments`).then(setAssignments).catch(() => {})}
            />

          </div>

          {/* ── Right column ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Pipeline progress */}
            <PipelineBar jobId={id} currentStage={job.pipeline_stage ?? "validate"} />

            {/* Start Validation form — shown when job is NEW */}
            {jobStatus === "NEW" && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheckIcon className="size-4 text-sky-600" />
                  <p className="text-sm font-semibold text-sky-700">New Job Received</p>
                </div>
                <p className="text-xs text-sky-600">
                  Review the job details on the left, confirm the checklist below, then submit to start validation.
                </p>

                {/* Checklist */}
                <div className="rounded-lg border border-sky-200 bg-white/60 px-4 py-3 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <Checkbox
                      id="validated-hm"
                      checked={validatedWithHM}
                      onCheckedChange={(v) => setValidatedWithHM(!!v)}
                      className="border-sky-400 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
                    />
                    <span className="text-sm text-sky-800">Validated with Hiring Manager</span>
                  </label>

                  {/* Contact Vendor — collapsible */}
                  <div className="border-t border-sky-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!contactVendorOpen && job) {
                          const to   = job.vendor_contact || "Team";
                          const title = job.title || "the position";
                          const client = job.end_client_name || job.company || "";
                          setVendorEmailSubject(`Following up: ${title}${client ? ` – ${client}` : ""}`);
                          setVendorEmailBody(
`Hi ${to},

I hope you're doing well. I'm reaching out regarding the ${title} position${client ? ` at ${client}` : ""}.

I'd love to connect and discuss the requirements in detail. Could you please share your availability for a quick call?

Looking forward to hearing from you.

Best regards,
${user?.name ?? "Hiring Team"}`
                          );
                          setVendorWhatsAppMsg(
`Hi ${to}, I'm reaching out regarding the *${title}* position${client ? ` at ${client}` : ""}. Could we connect to discuss the requirements? Please let me know your availability.`
                          );
                        }
                        setContactVendorOpen((v) => !v);
                      }}
                      className="flex w-full items-center justify-between text-xs font-medium text-sky-700 hover:text-sky-900"
                    >
                      <span className="flex items-center gap-1.5">
                        <MailIcon className="size-3.5" />
                        Contact Vendor
                        {(job?.vendor_email || job?.vendor_phone) && (
                          <span className="text-[10px] font-normal text-sky-500">
                            · {job.vendor_contact || job.vendor_name || job.vendor_email}
                          </span>
                        )}
                      </span>
                      {contactVendorOpen
                        ? <ChevronUpIcon className="size-3.5 text-sky-400" />
                        : <ChevronDownIcon className="size-3.5 text-sky-400" />}
                    </button>

                    {contactVendorOpen && (
                      <div className="mt-3 space-y-3">
                        {/* Vendor info chips */}
                        {(job?.vendor_email || job?.vendor_phone) && (
                          <div className="flex flex-wrap gap-2">
                            {job?.vendor_email && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] text-sky-700">
                                <MailIcon className="size-2.5" />{job.vendor_email}
                              </span>
                            )}
                            {job?.vendor_phone && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] text-sky-700">
                                <PhoneIcon className="size-2.5" />{job.vendor_phone}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Email composer */}
                        {job?.vendor_email && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">Email</p>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">Subject</Label>
                              <Input
                                value={vendorEmailSubject}
                                onChange={(e) => setVendorEmailSubject(e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">Body</Label>
                              <Textarea
                                value={vendorEmailBody}
                                onChange={(e) => setVendorEmailBody(e.target.value)}
                                rows={6}
                                className="text-xs resize-none"
                              />
                            </div>
                            <a
                              href={`mailto:${job.vendor_email}?subject=${encodeURIComponent(vendorEmailSubject)}&body=${encodeURIComponent(vendorEmailBody)}`}
                              className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium px-3 py-1.5"
                            >
                              <MailIcon className="size-3" /> Send Email
                            </a>
                          </div>
                        )}

                        {/* WhatsApp composer */}
                        {job?.vendor_phone && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">WhatsApp</p>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">Message</Label>
                              <Textarea
                                value={vendorWhatsAppMsg}
                                onChange={(e) => setVendorWhatsAppMsg(e.target.value)}
                                rows={3}
                                className="text-xs resize-none"
                              />
                            </div>
                            <a
                              href={`https://wa.me/${job.vendor_phone.replace(/\D/g, "")}?text=${encodeURIComponent(vendorWhatsAppMsg)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5"
                            >
                              <MessageCircleIcon className="size-3" /> Open WhatsApp
                            </a>
                          </div>
                        )}

                        {!job?.vendor_email && !job?.vendor_phone && (
                          <p className="text-xs text-muted-foreground italic">No vendor contact info saved. Add it in the Client &amp; Vendor tile.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-sm border-sky-300 text-sky-700 hover:bg-sky-100"
                    onClick={() => router.push("/manager/jobs")}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-9 text-sm bg-sky-600 hover:bg-sky-700 text-white gap-1.5"
                    disabled={!validatedWithHM || validating}
                    onClick={handleStartValidation}
                  >
                    <ClipboardCheckIcon className="size-3.5" />
                    {validating ? "Submitting…" : "Submit"}
                  </Button>
                </div>
              </div>
            )}

            {/* Validate Job panel — shown only while job is in PENDING_VALIDATION and no case exists yet */}
            {jobStatus === "PENDING_VALIDATION" && !job.case_id && (
              <InitiateCasePanel job={job} onSuccess={handleCaseInitiated} />
            )}

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground">
              Posted {new Date(job.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              {job.updated_at && ` · Updated ${new Date(job.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
            </div>

            {/* Pulse — notes & @mentions */}
            <PulsePanel jobId={id} />

            {/* Candidate sourcing panel */}
            <CandidateSourcingPanel jobId={id} role="manager" />
          </div>
        </div>
      </Shell>
      <Toaster position="top-right" richColors />
    </>
  );
}
