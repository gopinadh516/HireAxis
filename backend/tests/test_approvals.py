"""Approvals and assignments API regression tests."""
import pytest


# ── Approvals ─────────────────────────────────────────────────────────────────

def test_list_pending_approvals(client):
    r = client.get("/api/approvals/")
    assert r.status_code == 200

def test_approvals_response_is_list(client):
    r = client.get("/api/approvals/")
    assert isinstance(r.json(), list)

def test_approve_nonexistent_job_returns_404(client):
    r = client.patch("/api/approvals/00000000-0000-0000-0000-000000000000/approve",
                     json={"recruiter_id": "00000000-0000-0000-0000-000000000001"})
    assert r.status_code == 404

def test_reject_nonexistent_job_returns_404(client):
    r = client.patch("/api/approvals/00000000-0000-0000-0000-000000000000/reject",
                     json={"note": "test"})
    assert r.status_code == 404

def test_recruiters_list_endpoint(client):
    r = client.get("/api/approvals/recruiters")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ── Assignments ───────────────────────────────────────────────────────────────

def test_list_assignments_returns_200(client):
    r = client.get("/api/assignments/")
    assert r.status_code == 200

def test_start_nonexistent_assignment_returns_404(client):
    r = client.patch("/api/assignments/00000000-0000-0000-0000-000000000000/start")
    assert r.status_code == 404

def test_complete_nonexistent_assignment_returns_404(client):
    r = client.patch("/api/assignments/00000000-0000-0000-0000-000000000000/complete")
    assert r.status_code == 404


# ── Full approval flow (integration) ─────────────────────────────────────────

def test_approval_flow(client):
    """Create job → approve it → verify status changes."""
    # Create a job
    job_r = client.post("/api/jobs/", json={
        "title": "Approval Flow Test Job",
        "job_type": "FULL_TIME",
        "work_mode": "ONSITE",
        "job_status": "OPEN",
        "source": "manual",
        "headcount": 1,
        "openings": 1,
        "skills": [],
        "required_skills": [],
        "nice_to_have": [],
        "visa_requirements": [],
        "currency": "USD",
    })
    assert job_r.status_code == 200, job_r.text
    job_id = job_r.json()["id"]

    # Get a recruiter to assign
    recruiters = client.get("/api/approvals/recruiters").json()
    if not recruiters:
        pytest.skip("No recruiters available to test approval flow")

    recruiter_id = recruiters[0]["id"]

    # Approve the job
    approve_r = client.patch(f"/api/approvals/{job_id}/approve",
                             json={"recruiter_id": recruiter_id})
    assert approve_r.status_code == 200, approve_r.text

    # Verify job status updated
    job_after = client.get(f"/api/jobs/{job_id}").json()
    assert job_after["status"] in ("active", "searching"), f"Unexpected status: {job_after['status']}"
