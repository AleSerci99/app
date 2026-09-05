"""End-to-end backend tests for Rapportini API.

Covers:
 - Auth register + admin approve + login flow
 - Cantieri CRUD & authorization
 - Employee reports CRUD (current-month rule)
 - Admin reports edit (separate view) + approve
 - Matrix + export (excel/pdf)
 - Admin user management (role, approve, delete)
"""
import base64
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://work-reports-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@rapportini.it"
ADMIN_PASSWORD = "Admin1234!"


# ------- helpers ----------------------------------------------------------
def _rand(prefix):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:8]}"


def _auth_h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ------- shared state (module scope) -------------------------------------
STATE = {}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and data["user"]["role"] == "admin"
    STATE["admin_id"] = data["user"]["id"]
    return data["access_token"]


# =========================================================================
# Auth flow: register -> login blocked -> approve -> login works
# =========================================================================
class TestAuthFlow:
    def test_register_new_employee(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        pw = "Passw0rd!"
        r = requests.post(f"{API}/auth/register", json={"name": "TEST User", "email": email, "password": pw})
        assert r.status_code == 200, r.text
        STATE["emp_email"] = email
        STATE["emp_password"] = pw

    def test_login_blocked_before_approval(self):
        r = requests.post(f"{API}/auth/login", json={"email": STATE["emp_email"], "password": STATE["emp_password"]})
        assert r.status_code == 403, f"expected 403 pre-approval, got {r.status_code} {r.text}"

    def test_admin_approves_and_login_works(self, admin_token):
        # find user id
        r = requests.get(f"{API}/admin/users", headers=_auth_h(admin_token))
        assert r.status_code == 200
        target = next((u for u in r.json() if u["email"] == STATE["emp_email"]), None)
        assert target is not None, "Registered user not visible to admin"
        STATE["emp_id"] = target["id"]

        r = requests.patch(f"{API}/admin/users/{target['id']}/approve", json={"approved": True}, headers=_auth_h(admin_token))
        assert r.status_code == 200 and r.json()["approved"] is True

        r = requests.post(f"{API}/auth/login", json={"email": STATE["emp_email"], "password": STATE["emp_password"]})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body and body["user"]["role"] == "employee"
        STATE["emp_token"] = body["access_token"]

    def test_auth_me(self):
        r = requests.get(f"{API}/auth/me", headers=_auth_h(STATE["emp_token"]))
        assert r.status_code == 200 and r.json()["email"] == STATE["emp_email"]

    def test_register_duplicate_conflict(self):
        r = requests.post(f"{API}/auth/register", json={"name": "Dup", "email": STATE["emp_email"], "password": "Passw0rd!"})
        assert r.status_code == 409


# =========================================================================
# Cantieri
# =========================================================================
class TestCantieri:
    def test_employee_cannot_create(self):
        r = requests.post(f"{API}/cantieri", json={"name": _rand("cant"), "address": "Via A"}, headers=_auth_h(STATE["emp_token"]))
        assert r.status_code == 403

    def test_admin_creates_and_list_visible(self, admin_token):
        name = _rand("Cantiere")
        r = requests.post(f"{API}/cantieri", json={"name": name, "address": "Via Roma 1"}, headers=_auth_h(admin_token))
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["name"] == name and c.get("id")
        STATE["cantiere_id"] = c["id"]
        STATE["cantiere_name"] = name

        # visible to employee
        r = requests.get(f"{API}/cantieri", headers=_auth_h(STATE["emp_token"]))
        assert r.status_code == 200
        assert any(x["id"] == c["id"] for x in r.json())

    def test_admin_update_cantiere(self, admin_token):
        r = requests.patch(f"{API}/cantieri/{STATE['cantiere_id']}", json={"name": STATE["cantiere_name"] + "_upd", "address": "Via B"}, headers=_auth_h(admin_token))
        assert r.status_code == 200 and r.json()["name"].endswith("_upd")
        STATE["cantiere_name"] = STATE["cantiere_name"] + "_upd"

    def test_second_cantiere_for_admin_edit(self, admin_token):
        name = _rand("CantiereB")
        r = requests.post(f"{API}/cantieri", json={"name": name}, headers=_auth_h(admin_token))
        assert r.status_code == 200
        STATE["cantiere2_id"] = r.json()["id"]


# =========================================================================
# Employee reports
# =========================================================================
class TestEmployeeReports:
    def test_reject_non_current_month(self):
        past_month = (date.today().replace(day=1) - timedelta(days=1)).strftime("%Y-%m-%d")
        payload = {"date": past_month, "cantiere_id": STATE["cantiere_id"], "hours": 5, "drove_vehicle": False, "description": "x"}
        r = requests.post(f"{API}/reports", json=payload, headers=_auth_h(STATE["emp_token"]))
        assert r.status_code == 400

    def test_create_current_month_report(self):
        today = date.today().strftime("%Y-%m-%d")
        payload = {"date": today, "cantiere_id": STATE["cantiere_id"], "hours": 8, "drove_vehicle": True, "description": "TEST desc"}
        r = requests.post(f"{API}/reports", json=payload, headers=_auth_h(STATE["emp_token"]))
        assert r.status_code == 200, r.text
        rep = r.json()
        assert rep["hours"] == 8 and rep["drove_vehicle"] is True
        assert rep["cantiere_name"].startswith("TEST_")
        STATE["report_id"] = rep["id"]
        STATE["report_date"] = today

    def test_reject_invalid_cantiere(self):
        today = date.today().strftime("%Y-%m-%d")
        r = requests.post(f"{API}/reports", json={"date": today, "cantiere_id": "bad-id", "hours": 1, "drove_vehicle": False, "description": ""}, headers=_auth_h(STATE["emp_token"]))
        assert r.status_code == 400

    def test_mine_returns_current_month_only(self):
        r = requests.get(f"{API}/reports/mine", headers=_auth_h(STATE["emp_token"]))
        assert r.status_code == 200
        mine = r.json()
        cur = date.today().strftime("%Y-%m")
        assert all(x["month_key"] == cur for x in mine)
        assert any(x["id"] == STATE["report_id"] for x in mine)

    def test_update_own_report(self):
        today = date.today().strftime("%Y-%m-%d")
        payload = {"date": today, "cantiere_id": STATE["cantiere_id"], "hours": 6, "drove_vehicle": False, "description": "TEST upd"}
        r = requests.patch(f"{API}/reports/{STATE['report_id']}", json=payload, headers=_auth_h(STATE["emp_token"]))
        assert r.status_code == 200 and r.json()["hours"] == 6 and r.json()["description"] == "TEST upd"


# =========================================================================
# Admin edits stored separately + approval
# =========================================================================
class TestAdminReports:
    def test_admin_lists_reports_with_filters(self, admin_token):
        month = date.today().strftime("%Y-%m")
        r = requests.get(f"{API}/admin/reports", params={"month": month, "cantiere_id": STATE["cantiere_id"]}, headers=_auth_h(admin_token))
        assert r.status_code == 200
        assert any(x["id"] == STATE["report_id"] for x in r.json())

    def test_admin_edit_not_visible_to_employee(self, admin_token):
        today = date.today().strftime("%Y-%m-%d")
        payload = {"date": today, "cantiere_id": STATE["cantiere2_id"], "hours": 12, "drove_vehicle": True, "description": "ADMIN EDIT"}
        r = requests.patch(f"{API}/admin/reports/{STATE['report_id']}", json=payload, headers=_auth_h(admin_token))
        assert r.status_code == 200
        av = r.json()
        assert av["hours"] == 12 and av["description"] == "ADMIN EDIT" and av["admin_edited"] is True
        assert av["cantiere_id"] == STATE["cantiere2_id"]

        # employee still sees ORIGINAL values (hours 6, desc TEST upd, cantiere1)
        r = requests.get(f"{API}/reports/mine", headers=_auth_h(STATE["emp_token"]))
        emp_rep = next(x for x in r.json() if x["id"] == STATE["report_id"])
        assert emp_rep["hours"] == 6, f"KEY RULE BROKEN: employee sees admin's edit! {emp_rep}"
        assert emp_rep["description"] == "TEST upd"
        assert emp_rep["cantiere_id"] == STATE["cantiere_id"]

    def test_admin_approve_toggle(self, admin_token):
        r = requests.patch(f"{API}/admin/reports/{STATE['report_id']}/approve", json={"approved": True}, headers=_auth_h(admin_token))
        assert r.status_code == 200 and r.json()["approved"] is True
        r = requests.patch(f"{API}/admin/reports/{STATE['report_id']}/approve", json={"approved": False}, headers=_auth_h(admin_token))
        assert r.status_code == 200 and r.json()["approved"] is False


# =========================================================================
# Matrix + Export
# =========================================================================
class TestMatrixExport:
    def test_matrix_current_month(self, admin_token):
        month = date.today().strftime("%Y-%m")
        r = requests.get(f"{API}/admin/matrix", params={"month": month}, headers=_auth_h(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert data["month"] == month and isinstance(data["days"], list) and len(data["days"]) >= 28
        # employee should be there and hours (admin view => 12) tallied for today's day
        emp = next((e for e in data["employees"] if e["user_id"] == STATE["emp_id"]), None)
        assert emp is not None, "employee missing from matrix"
        day = str(int(date.today().strftime("%d")))
        assert emp["daily"].get(day, 0) >= 12, f"expected admin-edited hours reflected in matrix, got {emp['daily']}"

    def test_export_excel(self, admin_token):
        month = date.today().strftime("%Y-%m")
        r = requests.get(f"{API}/admin/export", params={"month": month, "format": "excel"}, headers=_auth_h(admin_token))
        assert r.status_code == 200
        b = r.json()
        assert b["filename"].endswith(".xlsx") and b["mime"].startswith("application/vnd.openxml") and len(base64.b64decode(b["base64"])) > 100

    def test_export_pdf(self, admin_token):
        month = date.today().strftime("%Y-%m")
        r = requests.get(f"{API}/admin/export", params={"month": month, "format": "pdf"}, headers=_auth_h(admin_token))
        assert r.status_code == 200
        b = r.json()
        assert b["filename"].endswith(".pdf") and b["mime"] == "application/pdf" and base64.b64decode(b["base64"])[:4] == b"%PDF"


# =========================================================================
# Admin user management
# =========================================================================
class TestUserManagement:
    def test_role_change_and_back(self, admin_token):
        r = requests.patch(f"{API}/admin/users/{STATE['emp_id']}/role", json={"role": "admin"}, headers=_auth_h(admin_token))
        assert r.status_code == 200 and r.json()["role"] == "admin"
        r = requests.patch(f"{API}/admin/users/{STATE['emp_id']}/role", json={"role": "employee"}, headers=_auth_h(admin_token))
        assert r.status_code == 200 and r.json()["role"] == "employee"

    def test_admin_cannot_demote_self(self, admin_token):
        r = requests.patch(f"{API}/admin/users/{STATE['admin_id']}/role", json={"role": "employee"}, headers=_auth_h(admin_token))
        assert r.status_code == 400


# =========================================================================
# Employee delete own current-month report + cleanup
# =========================================================================
class TestCleanup:
    def test_delete_own_report(self):
        r = requests.delete(f"{API}/reports/{STATE['report_id']}", headers=_auth_h(STATE["emp_token"]))
        assert r.status_code == 200

    def test_delete_cantieri(self, admin_token):
        for cid in (STATE.get("cantiere_id"), STATE.get("cantiere2_id")):
            if cid:
                requests.delete(f"{API}/cantieri/{cid}", headers=_auth_h(admin_token))

    def test_delete_test_user(self, admin_token):
        if STATE.get("emp_id"):
            r = requests.delete(f"{API}/admin/users/{STATE['emp_id']}", headers=_auth_h(admin_token))
            assert r.status_code == 200
