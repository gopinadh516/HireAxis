"""
HireAxis Email Agent
Watches an inbox via IMAP IDLE. On new email:
  1. Checks subject keywords
  2. Parses body + attachments
  3. Extracts job data via NVIDIA AI
  4. Creates job drafts in Supabase
  5. Notifies manager in real-time
"""
import logging
import time
from datetime import timezone
from datetime import date
from imap_tools import MailBox, AND

from config import (
    IMAP_HOST, IMAP_PORT, EMAIL_ADDRESS, EMAIL_PASSWORD, JOB_KEYWORDS
)
from parser import extract_text, is_job_requirement
from extractor import extract_jobs
from job_creator import process_email

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

RECONNECT_DELAY = 30  # seconds to wait before reconnecting on error


def process_message(msg) -> None:
    subject = msg.subject or "(no subject)"
    log.info(f"New email: '{subject}' from {msg.from_}")

    # ── Check subject keywords ────────────────────────────────────
    if not is_job_requirement(subject, JOB_KEYWORDS):
        log.info(f"Skipped (not a job requirement): {subject}")
        return

    log.info(f"Job requirement detected: {subject}")

    # ── Extract text from body + attachments ─────────────────────
    email_text = extract_text(msg)
    if not email_text.strip():
        log.warning("Empty email body, skipping")
        return

    # ── AI extraction ─────────────────────────────────────────────
    log.info("Calling NVIDIA AI to extract job details...")
    jobs = extract_jobs(email_text)

    if not jobs:
        log.warning(f"AI could not extract jobs from: {subject}")
        # Still log the email as 'ignored' via process_email with empty jobs
        process_email(
            message_id  = msg.uid or msg.message_id,
            subject     = subject,
            sender      = msg.from_,
            received_at = msg.date.replace(tzinfo=timezone.utc) if msg.date else __import__('datetime').datetime.now(timezone.utc),
            raw_content = email_text,
            extracted_jobs = [],
        )
        return

    # ── Save to Supabase ──────────────────────────────────────────
    count = process_email(
        message_id     = msg.uid or msg.message_id,
        subject        = subject,
        sender         = msg.from_,
        received_at    = msg.date.replace(tzinfo=timezone.utc) if msg.date else __import__('datetime').datetime.now(timezone.utc),
        raw_content    = email_text,
        extracted_jobs = jobs,
    )

    if count > 0:
        log.info(f"✅ Created {count} job draft(s) from: {subject}")
    else:
        log.info(f"Duplicate email skipped: {subject}")


def run():
    log.info(f"Starting HireAxis Email Agent")
    log.info(f"Connecting to {IMAP_HOST} as {EMAIL_ADDRESS}")

    while True:
        try:
            with MailBox(IMAP_HOST, port=IMAP_PORT).login(EMAIL_ADDRESS, EMAIL_PASSWORD) as mailbox:
                log.info("Connected. Listening for new emails via IMAP IDLE...")

                # Drain ALL existing unseen emails on startup (mark seen, skip processing)
                log.info("Draining existing unread emails (skipping old backlog)...")
                drained = 0
                for msg in mailbox.fetch(AND(seen=False), mark_seen=True, bulk=True):
                    drained += 1
                log.info(f"Drained {drained} old emails. Now watching for NEW emails only...")

                # IDLE loop — fires instantly when new email arrives
                for msg_data in mailbox.idle.wait(timeout=300):  # 5 min keepalive
                    if msg_data:
                        for msg in mailbox.fetch(AND(seen=False), mark_seen=True):
                            process_message(msg)

        except KeyboardInterrupt:
            log.info("Agent stopped by user.")
            break
        except Exception as e:
            log.error(f"Connection error: {e}")
            log.info(f"Reconnecting in {RECONNECT_DELAY}s...")
            time.sleep(RECONNECT_DELAY)


if __name__ == "__main__":
    run()
