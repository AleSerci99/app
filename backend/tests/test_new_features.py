"""New feature tests for Rapportini iteration 2.

NOTE: Run with `-n 0` (serial). Tests share cross-class STATE which does not
persist across xdist workers even with loadscope. All ordering is preserved
via ordered class/method definition.

Covers:
 - GET /api/admin/cantieri-summary (auth + shape + sort by hours desc)
 - POST /api/admin/reports/approve-all (bulk approve month)
 - POST /api/upload (multipart, path shape)
 - GET /api/files/{path} (token via query & bearer, admin any, employee own only, 401 no-token)
 - POST/PATCH reports with photos (round-trip + admin edit-invisible rule for photos)
"""
import io
import os
import uuid
from datetime import date

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://work-reports-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@rapportini.it"
ADMIN_PASSWORD = "Admin1234!"

STATE = {}


def _rand(prefix):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:8]}"


def _auth_h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


# 1x1 PNG (67 bytes)
TINY_PNG = bytes.fromhex(
    "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
    "890000000D49444154789C6360000002000001E221BC330000000049454E44AE426082"
)


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    d = r.json()
    STATE["admin_id"] = d["user"]["id"]
    return d["access_token"]


@pytest.fixture(scope="module")
def emp_token(admin_token):
    """Register + approve a fresh employee for these tests."""
    email = f"test_new_{uuid.uuid4().hex[:8]}@example.com"
    pw = "Passw0rd!"
    r = requests.post(f"{API}/auth/register", json={"name": "TEST NewFeat", "email": email, "password": pw})
    assert r.status_code == 200
    # find id
    r = requests.get(f"{API}/admin/users", headers=_auth_h(admin_token))
    uid = next(u["id"] for u in r.json() if u["email"] == email)
    STATE["emp_id"] = uid
    STATE["emp_email"] = email
    requests.patch(f"{API}/admin/users/{uid}/approve", json={"approved": True}, headers=_auth_h(admin_token))
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def emp2_token(admin_token):
    """A second employee to test cross-employee 403 for file download."""
    email = f"test_new2_{uuid.uuid4().hex[:8]}@example.com"
    pw = "Passw0rd!"
    r = requests.post(f"{API}/auth/register", json={"name": "TEST NewFeat2", "email": email, "password": pw})
    assert r.status_code == 200
    r = requests.get(f"{API}/admin/users", headers=_auth_h(admin_token))
    uid = next(u["id"] for u in r.json() if u["email"] == email)
    STATE["emp2_id"] = uid
    STATE["emp2_email"] = email
    requests.patch(f"{API}/admin/users/{uid}/approve", json={"approved": True}, headers=_auth_h(admin_token))
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw})
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def cantiere_id(admin_token):
    name = _rand("CantSummary")
    r = requests.post(f"{API}/cantieri", json={"name": name, "address": "Via NewFeat"}, headers=_auth_h(admin_token))
    assert r.status_code == 200
    STATE["cantiere_id"] = r.json()["id"]
    STATE["cantiere_name"] = name
    return r.json()["id"]


@pytest.fixture(scope="module")
def cantiere2_id(admin_token):
    name = _rand("CantSummary2")
    r = requests.post(f"{API}/cantieri", json={"name": name}, headers=_auth_h(admin_token))
    STATE["cantiere2_id"] = r.json()["id"]
    return r.json()["id"]


# =========================================================================
# Photo upload / download
# =========================================================================
class TestUploadAndFiles:
    def test_upload_requires_auth(self):
        files = {"file": ("t.png", io.BytesIO(TINY_PNG), "image/png")}
        r = requests.post(f"{API}/upload", files=files)
        assert r.status_code == 401

    def test_upload_returns_path(self, emp_token):
        files = {"file": ("t.png", io.BytesIO(TINY_PNG), "image/png")}
        r = requests.post(f"{API}/upload", files=files, headers=_bearer(emp_token))
        assert r.status_code == 200, r.text
        body = r.json()
        assert "path" in body
        p = body["path"]
        # rapportini-lavoro/uploads/{user_id}/{uuid}.ext
        parts = p.split("/")
        assert parts[0] == "rapportini-lavoro"
        assert parts[1] == "uploads"
        assert parts[2] == STATE["emp_id"]
        assert parts[3].endswith(".png")
        STATE["photo_path"] = p

    def test_upload_second_photo_for_emp2(self, emp2_token):
        files = {"file": ("t.png", io.BytesIO(TINY_PNG), "image/png")}
        r = requests.post(f"{API}/upload", files=files, headers=_bearer(emp2_token))
        assert r.status_code == 200
        STATE["photo_path_emp2"] = r.json()["path"]

    def test_file_download_missing_token_401(self):
        r = requests.get(f"{API}/files/{STATE['photo_path']}")
        assert r.status_code == 401

    def test_file_download_invalid_token_401(self):
        r = requests.get(f"{API}/files/{STATE['photo_path']}", params={"token": "not-a-jwt"})
        assert r.status_code == 401

    def test_file_download_owner_via_query_token(self, emp_token):
        r = requests.get(f"{API}/files/{STATE['photo_path']}", params={"token": emp_token})
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 0

    def test_file_download_owner_via_bearer(self, emp_token):
        r = requests.get(f"{API}/files/{STATE['photo_path']}", headers=_bearer(emp_token))
        assert r.status_code == 200
        assert len(r.content) > 0

    def test_file_download_admin_any_user(self, admin_token):
        r = requests.get(f"{API}/files/{STATE['photo_path']}", headers=_bearer(admin_token))
        assert r.status_code == 200
        assert len(r.content) > 0

    def test_file_download_other_employee_forbidden(self, emp2_token):
        r = requests.get(f"{API}/files/{STATE['photo_path']}", headers=_bearer(emp2_token))
        assert r.status_code == 403


# =========================================================================
# Reports carry photos + admin edit invisible for photos
# =========================================================================
class TestReportPhotos:
    def test_create_report_with_photos(self, emp_token, cantiere_id):
        today = date.today().strftime("%Y-%m-%d")
        payload = {
            "date": today, "cantiere_id": cantiere_id, "hours": 4,
            "drove_vehicle": False, "description": "TEST photo report",
            "photos": [STATE["photo_path"]],
        }
        r = requests.post(f"{API}/reports", json=payload, headers=_auth_h(emp_token))
        assert r.status_code == 200, r.text
        rep = r.json()
        assert rep["photos"] == [STATE["photo_path"]]
        STATE["report_id"] = rep["id"]

    def test_mine_returns_photos(self, emp_token):
        r = requests.get(f"{API}/reports/mine", headers=_auth_h(emp_token))
        assert r.status_code == 200
        rep = next(x for x in r.json() if x["id"] == STATE["report_id"])
        assert rep["photos"] == [STATE["photo_path"]]

    def test_admin_edit_photos_invisible_to_employee(self, admin_token, cantiere_id):
        # admin uploads (impersonating admin's own path) - simulate by using employee's original
        today = date.today().strftime("%Y-%m-%d")
        fake_admin_photo = f"rapportini-lavoro/uploads/{STATE['admin_id']}/{uuid.uuid4()}.jpg"
        payload = {
            "date": today, "cantiere_id": cantiere_id, "hours": 9,
            "drove_vehicle": True, "description": "ADMIN EDIT photos",
            "photos": [fake_admin_photo],
        }
        r = requests.patch(f"{API}/admin/reports/{STATE['report_id']}", json=payload, headers=_auth_h(admin_token))
        assert r.status_code == 200, r.text
        av = r.json()
        assert av["photos"] == [fake_admin_photo]
        assert av["admin_edited"] is True

        # admin list reflects admin's photos
        r = requests.get(f"{API}/admin/reports", headers=_auth_h(admin_token))
        av2 = next(x for x in r.json() if x["id"] == STATE["report_id"])
        assert av2["photos"] == [fake_admin_photo]

    def test_employee_still_sees_original_photos(self, emp_token):
        r = requests.get(f"{API}/reports/mine", headers=_auth_h(emp_token))
        rep = next(x for x in r.json() if x["id"] == STATE["report_id"])
        assert rep["photos"] == [STATE["photo_path"]], (
            f"KEY RULE BROKEN: employee sees admin's photos: {rep['photos']}"
        )
        assert rep["hours"] == 4  # original hours preserved for employee


# =========================================================================
# Cantieri summary
# =========================================================================
class TestCantieriSummary:
    def test_employee_forbidden(self, emp_token):
        r = requests.get(f"{API}/admin/cantieri-summary", headers=_auth_h(emp_token))
        assert r.status_code == 403

    def test_admin_summary_shape_and_sort(self, admin_token, emp_token, cantiere_id, cantiere2_id):
        # add another report on cantiere2 with fewer hours to check sorting
        today = date.today().strftime("%Y-%m-%d")
        r = requests.post(f"{API}/reports", json={
            "date": today, "cantiere_id": cantiere2_id, "hours": 2,
            "drove_vehicle": False, "description": "TEST c2", "photos": [],
        }, headers=_auth_h(emp_token))
        assert r.status_code == 200
        STATE["report2_id"] = r.json()["id"]

        month = date.today().strftime("%Y-%m")
        r = requests.get(f"{API}/admin/cantieri-summary", params={"month": month}, headers=_auth_h(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert body["month"] == month
        assert isinstance(body["cantieri"], list) and len(body["cantieri"]) >= 2
        # sorted by hours desc
        hours = [c["hours"] for c in body["cantieri"]]
        assert hours == sorted(hours, reverse=True), f"not sorted desc: {hours}"

        # find our cantieres. Note: admin edit made report1 use cantiere_id (still) with 9h in admin view
        c1 = next((c for c in body["cantieri"] if c["cantiere_id"] == cantiere_id), None)
        c2 = next((c for c in body["cantieri"] if c["cantiere_id"] == cantiere2_id), None)
        assert c1 is not None and c2 is not None
        # summary uses admin view -> report1 hours = 9
        assert c1["hours"] >= 9
        assert c1["employees"] >= 1 and c1["reports"] >= 1 and c1["days"] >= 1
        assert c2["hours"] == 2

    def test_default_month_is_current(self, admin_token):
        r = requests.get(f"{API}/admin/cantieri-summary", headers=_auth_h(admin_token))
        assert r.status_code == 200
        assert r.json()["month"] == date.today().strftime("%Y-%m")


# =========================================================================
# Bulk approve
# =========================================================================
class TestApproveAll:
    def test_employee_forbidden(self, emp_token):
        r = requests.post(f"{API}/admin/reports/approve-all",
                          json={"month": date.today().strftime("%Y-%m")},
                          headers=_auth_h(emp_token))
        assert r.status_code == 403

    def test_admin_bulk_approves_month(self, admin_token):
        month = date.today().strftime("%Y-%m")
        # count pending before
        r = requests.get(f"{API}/admin/reports", params={"month": month}, headers=_auth_h(admin_token))
        pending_before = [x for x in r.json() if not x["approved"]]
        assert len(pending_before) >= 1, "expected at least our seeded pending reports"

        r = requests.post(f"{API}/admin/reports/approve-all", json={"month": month}, headers=_auth_h(admin_token))
        assert r.status_code == 200, r.text
        body = r.json()
        assert "approved" in body and body["approved"] >= len(pending_before)

        # verify 0 pending after
        r = requests.get(f"{API}/admin/reports", params={"month": month}, headers=_auth_h(admin_token))
        pending_after = [x for x in r.json() if not x["approved"]]
        assert len(pending_after) == 0, f"still pending after bulk approve: {len(pending_after)}"

    def test_bulk_approve_no_pending_returns_zero(self, admin_token):
        month = date.today().strftime("%Y-%m")
        r = requests.post(f"{API}/admin/reports/approve-all", json={"month": month}, headers=_auth_h(admin_token))
        assert r.status_code == 200
        assert r.json()["approved"] == 0


# =========================================================================
# Cleanup
# =========================================================================
class TestCleanup:
    def test_cleanup(self, admin_token, emp_token):
        for rid_key in ("report_id", "report2_id"):
            rid = STATE.get(rid_key)
            if rid:
                requests.delete(f"{API}/reports/{rid}", headers=_auth_h(emp_token))
        for ck in ("cantiere_id", "cantiere2_id"):
            cid = STATE.get(ck)
            if cid:
                requests.delete(f"{API}/cantieri/{cid}", headers=_auth_h(admin_token))
        for uk in ("emp_id", "emp2_id"):
            uid = STATE.get(uk)
            if uid:
                requests.delete(f"{API}/admin/users/{uid}", headers=_auth_h(admin_token))
