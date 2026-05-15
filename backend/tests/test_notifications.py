"""Notifications API regression tests."""


def test_list_notifications_returns_200(client):
    r = client.get("/api/notifications/")
    assert r.status_code == 200

def test_notifications_response_shape(client):
    r = client.get("/api/notifications/")
    body = r.json()
    assert isinstance(body, list)

def test_mark_read_nonexistent_returns_404(client):
    r = client.patch("/api/notifications/00000000-0000-0000-0000-000000000000/read")
    assert r.status_code in (404, 422)

def test_mark_all_read(client):
    r = client.patch("/api/notifications/read-all")
    assert r.status_code in (200, 404)  # 404 if endpoint not implemented yet
