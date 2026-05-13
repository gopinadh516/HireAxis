"""
Talent Sourcing Agent
=====================
Runs two modes in a single loop:

  Mode 1 — On-demand (per job):
    Polls the `sourcing_tasks` table every TASK_POLL_SECONDS.
    When a `queued` task is found it searches for talents matching that job's
    title + skills and links them to the job via job_talents.

  Mode 2 — Scheduled general scan:
    Every SCAN_INTERVAL_SECONDS runs a search for each term in SEARCH_TERMS
    and adds discovered talents to the pool (no job linkage).

Usage:
    python3 main.py

Required env vars (see .env):
    SUPABASE_URL, SUPABASE_SERVICE_KEY, NVIDIA_API_KEY,
    GOOGLE_API_KEY, GOOGLE_CSE_ID
"""

import time
import traceback
from supabase import create_client

import config
import searcher
import extractor
import talent_saver

_db = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)


# ── Task queue helpers ────────────────────────────────────────────────────────

def fetch_queued_task() -> dict | None:
    res = (
        _db.table("sourcing_tasks")
        .select("*")
        .eq("status", "queued")
        .order("created_at")
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def mark_task(task_id: str, status: str, results_count: int = 0, error: str | None = None):
    from datetime import datetime, timezone
    update = {"status": status, "results_count": results_count}
    if status == "running":
        update["started_at"] = datetime.now(timezone.utc).isoformat()
    if status in ("completed", "failed"):
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    if error:
        update["error"] = error
    _db.table("sourcing_tasks").update(update).eq("id", task_id).execute()


def get_job(job_id: str) -> dict | None:
    res = _db.table("jobs").select("title,skills").eq("id", job_id).limit(1).execute()
    return res.data[0] if res.data else None


# ── Processing ────────────────────────────────────────────────────────────────

def process_task(task: dict):
    task_id = task["id"]
    job_id  = task.get("job_id")
    print(f"\n[main] Processing task {task_id} (job_id={job_id})")
    mark_task(task_id, "running")

    try:
        job = get_job(job_id) if job_id else None
        if job:
            query = searcher.build_job_query(job["title"], job.get("skills") or [])
        else:
            query = config.SEARCH_TERMS[0] if config.SEARCH_TERMS else "software developer"

        results = searcher.search(query)
        print(f"[main] Got {len(results)} results for query: {query!r}")

        saved = 0
        for result in results:
            talent_data = extractor.extract(result)
            if talent_data:
                tid = talent_saver.save(talent_data, job_id=job_id)
                if tid:
                    saved += 1

        print(f"[main] Task {task_id} completed — {saved} talents saved")
        mark_task(task_id, "completed", results_count=saved)

    except Exception as e:
        err = traceback.format_exc()
        print(f"[main] Task {task_id} failed: {e}")
        mark_task(task_id, "failed", error=str(e))


def run_general_scan():
    print(f"\n[main] Starting general scan ({len(config.SEARCH_TERMS)} terms)…")
    total = 0
    for term in config.SEARCH_TERMS:
        query   = searcher.build_general_query(term)
        results = searcher.search(query)
        print(f"[main] '{term}' → {len(results)} results")
        for result in results:
            talent_data = extractor.extract(result)
            if talent_data:
                tid = talent_saver.save(talent_data, job_id=None)
                if tid:
                    total += 1
    print(f"[main] General scan complete — {total} talents added/updated")


# ── Main loop ─────────────────────────────────────────────────────────────────

def main():
    print("=== Talent Sourcing Agent started ===")
    print(f"  Scan interval : {config.SCAN_INTERVAL_SECONDS}s")
    print(f"  Poll interval : {config.TASK_POLL_SECONDS}s")
    print(f"  Search terms  : {config.SEARCH_TERMS}")

    last_scan = 0  # force a scan on first wake

    while True:
        try:
            # Mode 1: drain on-demand task queue
            task = fetch_queued_task()
            if task:
                process_task(task)

            # Mode 2: scheduled general scan
            if time.time() - last_scan >= config.SCAN_INTERVAL_SECONDS:
                run_general_scan()
                last_scan = time.time()

        except Exception as e:
            print(f"[main] Unexpected error: {e}")
            traceback.print_exc()

        time.sleep(config.TASK_POLL_SECONDS)


if __name__ == "__main__":
    main()
