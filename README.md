# HireAxis

End-to-end AI-powered Applicant Tracking System (ATS) covering the full recruitment cycle: requirement intake → sourcing → AI screening → manager approval → interviews → submission → offer → joining.

See [requirement.md](requirement.md) for the full functional spec and `COMPLETE RECRUITMENT CYCLE (END-TO-END ATS - FLOW) - VSI.pdf` for the visual flow.

## Scope

**Recruitment flow stages**
Requirement Intake · Job Creation · Candidate Sourcing · AI Screening · Recruiter Shortlisting · Manager Review · Internal Interview · Final Shortlisting · Client Submission · Client Interview · Offer · Joining & Closure

**Candidate pipeline**
Sourced → Screened → Shortlisted → Manager Review → Approved → Internal Interview → Selected → Submitted → Client Interview → Offered → Joined
(Rejected / Dropped possible at any stage)

**User roles**
Recruiter · Manager · Internal Interview Panel · HR · Admin

## Core modules

- **Job** — creation, JD parsing, status tracking
- **Candidate** — resume parsing, dedup, candidate–job mapping
- **AI Screening** — semantic matching, 0–100 score, skill-gap analysis, recommendations
- **Approval** — manager approval workflow, rejection / comment logging
- **Interview** — internal scheduling, structured feedback, client-interview tracking
- **Submission** — submission tracking and history
- **Offer** — approval workflow (Manager + HR), tracking, release
- **Dashboard & Reporting** — recruiter performance, funnel conversion, time-to-hire, stage-wise analytics

## System services

Job Service · Candidate Service · AI Engine · Workflow Engine · Interview Service · Submission Service · Offer Service · Reporting Service

## Key controls

- Manager approval required before client submission (configurable)
- No duplicate candidates
- One candidate may map to multiple jobs
- Full audit trail (who did what)
- Role-based access control with multi-level approval

## Key metrics

Sourcing → Shortlisting · Shortlisting → Approval · Approval → Selection · Submission → Offer · Offer → Joining · Time-to-hire · Recruiter performance

## Status

Specification phase. No application code yet — repository currently holds requirements and reference flow.
