import copy
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    # Snapshot participants for all activities before each test
    snapshot = {name: list(data["participants"]) for name, data in activities.items()}
    yield
    # Restore participants after each test
    for name, participants in snapshot.items():
        activities[name]["participants"] = participants


def test_root_redirect():
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code in (301, 302, 303, 307, 308)
    assert resp.headers.get("location") == "/static/index.html"


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Soccer Team" in data
    assert isinstance(data["Soccer Team"]["participants"], list)


def test_signup_success():
    email = "newstudent@example.com"
    activity_name = "Chess Club"
    resp = client.post(f"/activities/{activity_name}/signup", params={"email": email})
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")
    assert email in activities[activity_name]["participants"]


def test_signup_duplicate():
    activity_name = "Chess Club"
    existing_email = activities[activity_name]["participants"][0]
    resp = client.post(f"/activities/{activity_name}/signup", params={"email": existing_email})
    assert resp.status_code == 400
    assert resp.json().get("detail") == "Student already signed up for this activity"


def test_signup_nonexistent_activity():
    resp = client.post("/activities/Nonexistent/signup", params={"email": "someone@example.com"})
    assert resp.status_code == 404
    assert resp.json().get("detail") == "Activity not found"


def test_unregister_success():
    activity_name = "Drama Club"
    existing_email = activities[activity_name]["participants"][0]
    resp = client.delete(f"/activities/{activity_name}/unregister", params={"email": existing_email})
    assert resp.status_code == 200
    assert resp.json().get("message", "").startswith("Unregistered")
    assert existing_email not in activities[activity_name]["participants"]


def test_unregister_not_registered():
    activity_name = "Drama Club"
    resp = client.delete(f"/activities/{activity_name}/unregister", params={"email": "nobody@example.com"})
    assert resp.status_code == 404
    assert resp.json().get("detail") == "Student not registered for this activity"


def test_unregister_nonexistent_activity():
    resp = client.delete("/activities/FakeActivity/unregister", params={"email": "x@example.com"})
    assert resp.status_code == 404
    assert resp.json().get("detail") == "Activity not found"
