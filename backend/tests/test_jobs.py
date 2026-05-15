"""Jobs API regression tests."""
import pytest

JOB_PAYLOAD = {
    "title": "Test QA Engineer",
    "job_type": "FULL_TIME",
    "work_mode": "REMOTE",
    "job_status": "OPEN",
    "source": "manual",
    "headcount": 1,
    "openings": 1,
    "skills": ["Python", "pytest"],
    "required_skills": ["Python"],
    "nice_to_have": [],
    "visa_requirements": [],
    "currency": "USD",
    "description": "Automated test job — safe to delete",
}

@pytest.fixture(scope="module")
def created_job(client):
    r = client.post("/api/jobs/", json=JOB_PAYLOAD)
    assert r.status_code == 200, r.text
    job = r.json()
    yield job
    # Cleanup: delete is not implemented, but we can close it
    client.patch(f"/api/jobs/{job['id']}", json={"status": "closed"})


# ── List ──────────────────────────────────────────────────────────────────────

def test_list_jobs_returns_200(client):
    r = client.get("/api/jobs/")
    assert r.status_code == 200

def test_list_jobs_has_pagination_keys(client):
    r = client.get("/api/jobs/")
    data = r.json()
    assert "items" in data or isinstance(data, list), "Unexpected response shape"

def test_list_jobs_filter_by_status(client):
    r = client.get("/api/jobs/", params={"status": "active"})
    assert r.status_code == 200

def test_list_jobs_filter_by_type(client):
    r = client.get("/api/jobs/", params={"job_type": "FULL_TIME"})
    assert r.status_code == 200

def test_list_jobs_search(client):
    r = client.get("/api/jobs/", params={"q": "Engineer"})
    assert r.status_code == 200

def test_list_jobs_pagination(client):
    r = client.get("/api/jobs/", params={"page": 1, "page_size": 5})
    assert r.status_code == 200


# ── Create ────────────────────────────────────────────────────────────────────

def test_create_job_returns_id(created_job):
    assert "id" in created_job

def test_create_job_title_matches(created_job):
    assert created_job["title"] == JOB_PAYLOAD["title"]

def test_create_job_missing_title_returns_422(client):
    r = client.post("/api/jobs/", json={"job_type": "FULL_TIME"})
    assert r.status_code == 422

def test_create_job_contract_type(client):
    payload = {**JOB_PAYLOAD, "job_type": "CONTRACT", "title": "Test Contract Job",
               "end_client_name": "ACME Corp", "pay_rate_min": 50, "pay_rate_max": 80}
    r = client.post("/api/jobs/", json=payload)
    assert r.status_code == 200


# ── Get single ────────────────────────────────────────────────────────────────

def test_get_job_by_id(client, created_job):
    r = client.get(f"/api/jobs/{created_job['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created_job["id"]

def test_get_job_not_found(client):
    r = client.get("/api/jobs/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


# ── Update ────────────────────────────────────────────────────────────────────

def test_update_job_title(client, created_job):
    r = client.patch(f"/api/jobs/{created_job['id']}", json={"title": "Updated QA Engineer"})
    assert r.status_code == 200

def test_toggle_job_active(client, created_job):
    r = client.patch(f"/api/jobs/{created_job['id']}/toggle")
    assert r.status_code == 200


# ── Public endpoint ───────────────────────────────────────────────────────────

def test_public_post_job(client):
    r = client.post("/api/public/jobs", json={
        **JOB_PAYLOAD, "title": "Public Test Job",
        "contact_email": "test@example.com",
    })
    assert r.status_code in (200, 201)
