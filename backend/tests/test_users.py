"""Users API regression tests."""
import pytest


# ── List ──────────────────────────────────────────────────────────────────────

def test_list_users_returns_200(client):
    r = client.get("/api/users/")
    assert r.status_code == 200

def test_list_users_returns_list(client):
    r = client.get("/api/users/")
    assert isinstance(r.json(), list)

def test_list_users_have_required_fields(client):
    r = client.get("/api/users/")
    users = r.json()
    if users:
        u = users[0]
        for field in ("id", "name", "email", "role", "is_active"):
            assert field in u, f"Missing field: {field}"

def test_list_users_roles_are_valid(client):
    r = client.get("/api/users/")
    for u in r.json():
        assert u["role"] in ("super_admin", "manager", "recruiter")


# ── Create (validation only — no actual Supabase auth call) ──────────────────

def test_create_user_invalid_role_returns_400(client):
    r = client.post("/api/users/", json={
        "name": "Test", "email": "test@test.com", "role": "super_admin"
    })
    assert r.status_code == 400

def test_create_user_missing_email_returns_422(client):
    r = client.post("/api/users/", json={"name": "No Email", "role": "manager"})
    assert r.status_code == 422

def test_create_user_missing_name_returns_422(client):
    r = client.post("/api/users/", json={"email": "no-name@test.com", "role": "recruiter"})
    assert r.status_code == 422


# ── Get single ────────────────────────────────────────────────────────────────

def test_get_user_not_found(client):
    r = client.get("/api/users/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404

def test_get_existing_user(client):
    users = client.get("/api/users/").json()
    if users:
        uid = users[0]["id"]
        r = client.get(f"/api/users/{uid}")
        assert r.status_code == 200
        assert r.json()["id"] == uid


# ── Update ────────────────────────────────────────────────────────────────────

def test_update_user_not_found(client):
    r = client.patch("/api/users/00000000-0000-0000-0000-000000000000", json={"name": "X"})
    assert r.status_code == 404

def test_update_user_empty_body_returns_400(client):
    users = client.get("/api/users/").json()
    if users:
        uid = users[0]["id"]
        r = client.patch(f"/api/users/{uid}", json={})
        assert r.status_code == 400


# ── Toggle ────────────────────────────────────────────────────────────────────

def test_toggle_user_not_found(client):
    r = client.patch("/api/users/00000000-0000-0000-0000-000000000000/toggle")
    assert r.status_code == 404
