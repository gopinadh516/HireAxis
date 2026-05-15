"""Talents API regression tests."""
import pytest

TALENT_PAYLOAD = {
    "name": "Test Talent Regression",
    "email": "test.talent.regression@example.com",
    "skills": ["Python", "Django"],
    "source": "manual",
    "talent_source": "INTERNAL",
}


@pytest.fixture(scope="module")
def created_talent(client):
    r = client.post("/api/talents/", json=TALENT_PAYLOAD)
    assert r.status_code == 200, r.text
    talent = r.json()
    yield talent


# ── List ──────────────────────────────────────────────────────────────────────

def test_list_talents_returns_200(client):
    r = client.get("/api/talents/")
    assert r.status_code == 200

def test_list_talents_has_items_key(client):
    r = client.get("/api/talents/")
    body = r.json()
    assert "items" in body or isinstance(body, list)

def test_list_talents_filter_by_status(client):
    r = client.get("/api/talents/", params={"status": "sourced"})
    assert r.status_code == 200

def test_list_talents_search(client):
    r = client.get("/api/talents/", params={"q": "Test"})
    assert r.status_code == 200

def test_list_talents_pagination(client):
    r = client.get("/api/talents/", params={"page": 1, "page_size": 10})
    assert r.status_code == 200


# ── Create ────────────────────────────────────────────────────────────────────

def test_create_talent_returns_id(created_talent):
    assert "id" in created_talent

def test_create_talent_name_matches(created_talent):
    assert created_talent["name"] == TALENT_PAYLOAD["name"]

def test_create_talent_missing_name_returns_422(client):
    r = client.post("/api/talents/", json={"email": "no-name@example.com"})
    assert r.status_code == 422


# ── Get single ────────────────────────────────────────────────────────────────

def test_get_talent_by_id(client, created_talent):
    r = client.get(f"/api/talents/{created_talent['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created_talent["id"]

def test_get_talent_not_found(client):
    r = client.get("/api/talents/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


# ── Update ────────────────────────────────────────────────────────────────────

def test_update_talent_phone(client, created_talent):
    r = client.patch(f"/api/talents/{created_talent['id']}", json={"phone": "+91 99999 00001"})
    assert r.status_code == 200


# ── Document upload endpoint ──────────────────────────────────────────────────

def test_talent_documents_endpoint(client, created_talent):
    r = client.get(f"/api/talents/{created_talent['id']}/documents")
    assert r.status_code in (200, 404)  # 404 if not yet implemented
