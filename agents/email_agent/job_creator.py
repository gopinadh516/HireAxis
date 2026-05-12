"""
Saves extracted jobs to Supabase with full dedup protection.
Creates job drafts + manager notification.
"""
import logging
from datetime import datetime, timezone
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, MANAGER_USER_ID

log = logging.getLogger(__name__)

db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def process_email(
    message_id: str,
    subject: str,
    sender: str,
    received_at: datetime,
    raw_content: str,
    extracted_jobs: list[dict],
) -> int:
    """
    Full pipeline: log email → create jobs → notify manager.
    Returns number of jobs created. Returns 0 if already processed.
    """

    # ── Layer 1: dedup by message_id ─────────────────────────────
    existing = db.table("email_logs").select("id, status").eq("message_id", message_id).execute()
    if existing.data:
        log.info(f"Skipping already-processed email: {message_id}")
        return 0

    # ── Insert email log (pending) ────────────────────────────────
    log_row = db.table("email_logs").insert({
        "message_id":  message_id,
        "subject":     subject,
        "sender":      sender,
        "received_at": received_at.isoformat(),
        "raw_content": raw_content[:5000],  # cap size
        "status":      "parsed" if extracted_jobs else "ignored",
    }).execute()

    email_log_id = log_row.data[0]["id"]

    if not extracted_jobs:
        log.info(f"No jobs extracted from email: {subject}")
        return 0

    # ── Create job drafts ─────────────────────────────────────────
    jobs_created = 0
    created_job_ids = []

    for job in extracted_jobs:
        try:
            result = db.table("jobs").insert({
                "title":           job.get("title", subject),
                "skills":          job.get("skills", []),
                "experience_min":  job.get("experience_min"),
                "experience_max":  job.get("experience_max"),
                "location":        job.get("location"),
                "headcount":       job.get("headcount") or 1,
                "budget_min":      job.get("budget_min"),
                "budget_max":      job.get("budget_max"),
                "description":     job.get("description"),
                "raw_email_text":  raw_content[:3000],
                "source":          "email",
                "status":          "pending_approval",
            }).execute()

            job_id = result.data[0]["id"]
            created_job_ids.append(job_id)
            jobs_created += 1
            log.info(f"Created job: {job.get('title')} [{job_id}]")

        except Exception as e:
            log.error(f"Failed to create job '{job.get('title')}': {e}")

    # ── Update email log with first job_id + final status ─────────
    db.table("email_logs").update({
        "job_id":      created_job_ids[0] if created_job_ids else None,
        "parsed_data": {"jobs_extracted": len(extracted_jobs), "job_ids": created_job_ids},
        "status":      "job_created" if jobs_created > 0 else "failed",
    }).eq("id", email_log_id).execute()

    # ── Notify manager ────────────────────────────────────────────
    if jobs_created > 0 and MANAGER_USER_ID:
        _notify_manager(subject, jobs_created, created_job_ids[0])

    return jobs_created


def _notify_manager(email_subject: str, count: int, job_id: str):
    try:
        label = f"{count} job requirement{'s' if count > 1 else ''}" if count > 1 else "New job requirement"
        db.table("notifications").insert({
            "user_id":  MANAGER_USER_ID,
            "type":     "new_job_draft",
            "title":    label,
            "message":  f"Parsed from: {email_subject}",
            "data":     {"job_id": job_id, "count": count},
            "is_read":  False,
        }).execute()
    except Exception as e:
        log.warning(f"Could not send manager notification: {e}")
