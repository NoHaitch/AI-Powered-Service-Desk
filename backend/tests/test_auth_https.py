"""Exercise the complete release ingress and real datastores in a disposable stack."""

import json
import os
import re
import socket
import ssl
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit
from uuid import uuid4

import httpx2 as httpx
import pytest

from app.identity.security import ACCESS_COOKIE, REFRESH_COOKIE

ORIGIN = os.getenv("DESK_AUTH_TEST_ORIGIN")
ROOT = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.skipif(not ORIGIN, reason="Run backend/tests/run_m1_auth_https.sh.")
AUTH = "/api/v1/auth"
INCIDENTS = "/api/v1/incidents"
QUEUE = "/api/v1/queues/l1/incidents"
ACCESS_SECONDS = int(os.getenv("DESK_AUTH_TEST_ACCESS_SECONDS", "5"))
IDLE_SECONDS = int(os.getenv("DESK_AUTH_TEST_IDLE_SECONDS", "18"))


def tls() -> ssl.SSLContext:
    return ssl.create_default_context(
        cafile=os.environ.get("DESK_AUTH_TEST_CA", os.environ["DESK_AUTH_TEST_CERT"])
    )


def client() -> httpx.Client:
    return httpx.Client(base_url=ORIGIN, verify=tls(), timeout=12, trust_env=False)


def stack(*args: str, stdin: str | None = None) -> str:
    name = os.environ["DESK_AUTH_TEST_PROJECT"]
    assert re.fullmatch(r"service-desk-auth-test-[0-9]+", name)
    compose_files = ["-f", str(ROOT / "compose.yaml")]
    if os.getenv("DESK_AUTH_TEST_VITE") == "1":
        compose_files.extend(("-f", str(ROOT / "compose.dev.yaml")))
    compose_files.extend(("-f", os.environ["DESK_AUTH_TEST_OVERLAY"]))
    return subprocess.check_output(
        [
            "docker",
            "compose",
            "--project-name",
            name,
            *compose_files,
            *args,
        ],
        text=True,
        cwd=ROOT,
        timeout=180,
        input=stdin,
    ).strip()


def query(command: str) -> str:
    return stack(
        "exec",
        "-T",
        "postgres",
        "psql",
        "-XAt",
        "-U",
        "postgres",
        "-d",
        "service_desk",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        command,
    )


@pytest.fixture(scope="module")
def passwords() -> dict[str, str]:
    class PrivatePasswords(dict[str, str]):
        def __repr__(self) -> str:
            return "<private synthetic passwords>"

    return PrivatePasswords(
        json.loads(Path(os.environ["DESK_AUTH_TEST_PASSWORD_FILE"]).read_text())
    )


def post(
    connection: httpx.Client, path: str, token: str | None = None, **options: Any
) -> httpx.Response:
    headers = {"Origin": str(ORIGIN)}
    if token is not None:
        headers["X-CSRF-Token"] = token
    headers.update(options.pop("headers", {}))
    return connection.post(path, headers=headers, **options)


def login(
    connection: httpx.Client,
    username: str,
    password: str,
    extra_headers: dict[str, str] | None = None,
) -> httpx.Response:
    return post(
        connection,
        AUTH + "/login",
        headers={"X-Desk-Request": "1", **(extra_headers or {})},
        json={"username": username, "password": password},
    )


def signed_in(connection: httpx.Client, name: str, passwords: dict[str, str]) -> str:
    result = login(connection, name, passwords[name])
    assert result.status_code == 200, result.status_code
    return result.json()["csrf_token"]


def wait_for_auth(passwords: dict[str, str]) -> None:
    deadline = time.monotonic() + 16
    with client() as connection:
        while time.monotonic() < deadline:
            response = login(connection, "priya", passwords["priya"])
            if response.status_code == 200:
                assert (
                    post(connection, AUTH + "/logout", response.json()["csrf_token"]).status_code
                    == 204
                )
                return
            assert response.status_code == 503
            time.sleep(0.5)
    pytest.fail("Authentication did not recover in the expected test window.")


def test_https_and_limiter_initialization(passwords: dict[str, str]) -> None:
    endpoint = urlsplit(str(ORIGIN))
    for version in (ssl.TLSVersion.TLSv1_2, ssl.TLSVersion.TLSv1_3):
        context = tls()
        context.minimum_version = context.maximum_version = version
        with (
            socket.create_connection((endpoint.hostname, endpoint.port), timeout=5) as connection,
            context.wrap_socket(connection, server_hostname=endpoint.hostname) as secure,
        ):
            expected = {ssl.TLSVersion.TLSv1_2: "TLSv1.2", ssl.TLSVersion.TLSv1_3: "TLSv1.3"}
            assert secure.version() == expected[version]
    with client() as connection:
        assert connection.get("/api/health/ready").status_code == 200
        assert connection.get("/api/health/redis").status_code == 200
        assert connection.get("/api/health/auth").status_code == 503
        response = login(connection, "maya", passwords["maya"])
        assert response.status_code == 503 and "set-cookie" not in response.headers
    wait_for_auth(passwords)
    with client() as connection:
        assert connection.get("/api/health/auth").status_code == 200
        html = connection.get("/login")
        assert html.headers["x-frame-options"] == "DENY"
        if os.getenv("DESK_AUTH_TEST_VITE") != "1":
            assert "frame-ancestors 'none'" in html.headers["content-security-policy"]


def test_login_cookie_csrf_and_rejected_credentials(passwords: dict[str, str]) -> None:
    with client() as connection:
        assert connection.get(AUTH + "/me").status_code == 401
        assert (
            login(
                connection, "maya", passwords["maya"], {"Origin": "https://example.invalid"}
            ).status_code
            == 403
        )
        assert (
            post(
                connection,
                AUTH + "/login",
                json={
                    "username": "maya",
                    "password": passwords["maya"],
                },
            ).status_code
            == 403
        )
        failures = (
            login(connection, "taylor", passwords["taylor"]),
            login(connection, "quinn", passwords["quinn"]),
            login(connection, "unknown-person", "synthetic-wrong-password"),
            login(connection, "maya", "synthetic-wrong-password"),
        )
        for failure in failures:
            assert failure.status_code == 401 and "set-cookie" not in failure.headers
            assert {k: v for k, v in failure.json().items() if k != "request_id"} == {
                "code": "unauthorized",
                "message": "Unauthorized",
            }
        result = login(connection, "  MAYA ", passwords["maya"])
        assert result.status_code == 200
        assert set(result.json()) == {"user", "csrf_token"}
        assert set(result.json()["user"]) == {"id", "display_name", "roles"}
        assert result.headers["cache-control"] == "no-store"
        cookies = result.headers.get_list("set-cookie")
        for name, path in ((ACCESS_COOKIE, "/api/v1"), (REFRESH_COOKIE, "/api/v1/auth")):
            cookie = next(header for header in cookies if header.startswith(name + "="))
            assert "HttpOnly" in cookie and "Secure" in cookie and "SameSite=lax" in cookie
            assert f"Path={path};" in cookie and "Domain=" not in cookie
            assert connection.cookies[name] not in result.text
        assert post(connection, AUTH + "/refresh").status_code == 403
        assert (
            post(
                connection,
                AUTH + "/logout",
                result.json()["csrf_token"],
                headers={
                    "Origin": "https://example.invalid",
                },
            ).status_code
            == 403
        )
        assert connection.get(AUTH + "/me").json()["display_name"] == "Maya Chen"
        legitimate = connection.cookies[ACCESS_COOKIE]
        with client() as rejected:
            assert (
                rejected.get(
                    AUTH + "/me",
                    headers={
                        "Cookie": f"{ACCESS_COOKIE}={legitimate.rsplit('.', 1)[0]}.invalid",
                    },
                ).status_code
                == 401
            )
            assert (
                rejected.get(
                    AUTH + "/csrf",
                    headers={
                        "Origin": "https://example.invalid",
                    },
                ).status_code
                == 401
            )
        assert post(connection, AUTH + "/logout", result.json()["csrf_token"]).status_code == 204
        assert len(connection.cookies) == 0


def test_incident_visibility_current_queue_and_audit(passwords: dict[str, str]) -> None:
    with (
        client() as employee,
        client() as other,
        client() as agent,
        client() as outside,
        client() as admin,
    ):
        csrf = signed_in(employee, "maya", passwords)
        report = {
            "summary": "HTTPS journey " + uuid4().hex,
            "description": "A synthetic disruption",
            "prompt_review": True,
        }
        assert post(employee, INCIDENTS, json=report).status_code == 403
        assert post(employee, INCIDENTS, csrf, json={**report, "priority": 1}).status_code == 422
        saved = post(employee, INCIDENTS, csrf, json=report)
        assert saved.status_code == 201, saved.status_code
        row = saved.json()
        ticket = f"{INCIDENTS}/{row['id']}"
        assert re.fullmatch(r"INC-[0-9]{6,19}", row["reference"])
        assert row["priority"] is None and row["status"] == "new"
        assert "prompt_review" not in row and "queue" not in row
        assert row["id"] in {item["id"] for item in employee.get(INCIDENTS).json()}
        assert employee.get(QUEUE).status_code == 403
        assert (
            post(
                employee, ticket + "/triage", csrf, json={"impact": "low", "urgency": "high"}
            ).status_code
            == 403
        )

        signed_in(other, "jordan", passwords)
        assert other.get(ticket).status_code == 404
        assert other.get(f"{INCIDENTS}/{uuid4()}").status_code == 404
        assert row["id"] not in {item["id"] for item in other.get(INCIDENTS).json()}
        outsider_token = signed_in(outside, "drew", passwords)
        assert outside.get(QUEUE).status_code == 403
        assert outside.get(ticket).status_code == 404
        assert (
            post(
                outside,
                ticket + "/triage",
                outsider_token,
                json={"impact": "high", "urgency": "high"},
            ).status_code
            == 403
        )
        signed_in(admin, "sam", passwords)
        assert admin.get(ticket).status_code == 404 and admin.get(QUEUE).status_code == 403

        agent_csrf = signed_in(agent, "alex", passwords)
        queue = agent.get(QUEUE + "?flagged_only=true")
        assert row["id"] in {item["id"] for item in queue.json()}
        assert all(item["prompt_review"] for item in queue.json())
        assert agent.get(ticket).json()["queue"] == "l1"
        assessment = {"impact": "low", "urgency": "high"}
        assert post(agent, ticket + "/triage", csrf, json=assessment).status_code == 403
        assert (
            post(
                agent, ticket + "/triage", agent_csrf, json={"impact": "unknown", "urgency": "high"}
            ).status_code
            == 422
        )
        triage = post(agent, ticket + "/triage", agent_csrf, json=assessment)
        assert triage.status_code == 200 and triage.json()["priority"] == 3
        assert post(agent, ticket + "/triage", agent_csrf, json=assessment).status_code == 409
        assert employee.get(ticket).json()["status"] == "triaged"
        assert (
            query(
                "SELECT string_agg(action, ',' ORDER BY occurred_at) "
                f"FROM desk.incident_audit_events WHERE ticket_id = '{row['id']}'"
            )
            == "submitted,triaged"
        )

        # Membership is evaluated on every resource request made with the same access token.
        assert (
            query(
                "DELETE FROM desk.queue_memberships WHERE user_id = "
                "(SELECT id FROM desk.users WHERE username = 'alex')"
            )
            == "DELETE 1"
        )
        try:
            assert agent.get(ticket).status_code == 404
            assert agent.get(QUEUE).status_code == 403
        finally:
            query(
                "INSERT INTO desk.queue_memberships SELECT q.id, u.id "
                "FROM desk.support_queues q, desk.users u "
                "WHERE q.code = 'l1' AND u.username = 'alex'"
            )


def test_refresh_rotation_reuse_logout_and_residual_access(passwords: dict[str, str]) -> None:
    with client() as connection, client() as predecessor:
        csrf = signed_in(connection, "casey", passwords)
        old_refresh = connection.cookies[REFRESH_COOKIE]
        first = post(connection, AUTH + "/refresh", csrf)
        assert first.status_code == 204 and connection.cookies[REFRESH_COOKIE] != old_refresh
        old = {"Cookie": f"{REFRESH_COOKIE}={old_refresh}"}
        assert post(predecessor, AUTH + "/refresh", csrf, headers=old).status_code == 401
        assert post(connection, AUTH + "/refresh", csrf).status_code == 401
        assert connection.get(AUTH + "/me").status_code == 200

    with client() as connection, client() as expired_browser:
        csrf = signed_in(connection, "avery", passwords)
        access = connection.cookies[ACCESS_COOKIE]
        refresh = connection.cookies[REFRESH_COOKIE]
        headers = {"Cookie": f"{REFRESH_COOKIE}={refresh}"}
        assert post(expired_browser, AUTH + "/logout", csrf, headers=headers).status_code == 204
        assert post(expired_browser, AUTH + "/logout", csrf, headers=headers).status_code == 204
        assert post(connection, AUTH + "/refresh", csrf).status_code == 401
        assert (
            connection.get(
                AUTH + "/me", headers={"Cookie": f"{ACCESS_COOKIE}={access}"}
            ).status_code
            == 200
        )
    assert (
        query(
            "SELECT count(*) FROM desk.auth_audit_events "
            "WHERE action = 'reuse' AND outcome = 'success'"
        )
        == "1"
    )
    assert query(
        "SELECT count(*) FROM desk.refresh_families WHERE revocation_reason IN ('reuse', 'logout')"
    ).isdigit()


def test_recognized_reuse_revokes_even_when_family_is_limited(passwords: dict[str, str]) -> None:
    with client() as connection, client() as stale:
        csrf = signed_in(connection, "avery", passwords)
        old = connection.cookies[REFRESH_COOKIE]
        for _ in range(6):
            assert post(connection, AUTH + "/refresh", csrf).status_code == 204
        assert post(connection, AUTH + "/refresh", csrf).status_code == 429
        cookie = {"Cookie": f"{REFRESH_COOKIE}={old}"}
        assert post(stale, AUTH + "/refresh", csrf, headers=cookie).status_code == 401
        assert post(connection, AUTH + "/refresh", csrf).status_code == 401


def test_concurrent_refresh_and_logout(passwords: dict[str, str]) -> None:
    for logout_race in (False, True):
        with client() as initial:
            csrf = signed_in(initial, "riley", passwords)
            token = initial.cookies[REFRESH_COOKIE]
        cookie = {"Cookie": f"{REFRESH_COOKIE}={token}"}

        def run(path: str, csrf: str, cookie: dict[str, str]) -> tuple[int, str | None]:
            with client() as participant:
                result = post(participant, AUTH + path, csrf, headers=cookie)
                return result.status_code, participant.cookies.get(REFRESH_COOKIE)

        with ThreadPoolExecutor(max_workers=2) as pool:
            first = pool.submit(run, "/refresh", csrf, cookie)
            second = pool.submit(run, "/logout" if logout_race else "/refresh", csrf, cookie)
            results = [first.result(), second.result()]
        statuses = sorted(result[0] for result in results)
        assert statuses in ([[204, 204], [204, 401]] if logout_race else [[204, 401]])
        with client() as verifier:
            for _, successor in results:
                if successor:
                    assert (
                        post(
                            verifier,
                            AUTH + "/refresh",
                            csrf,
                            headers={
                                "Cookie": f"{REFRESH_COOKIE}={successor}",
                            },
                        ).status_code
                        == 401
                    )


def test_simultaneous_triage_produces_one_audit(passwords: dict[str, str]) -> None:
    with client() as employee, client() as l1a, client() as l1b:
        token = signed_in(employee, "priya", passwords)
        created = post(
            employee, INCIDENTS, token, json={"summary": "Race review", "description": "Synthetic"}
        )
        assert created.status_code == 201
        ticket_id = created.json()["id"]
        path = f"{INCIDENTS}/{ticket_id}/triage"
        token_a = signed_in(l1a, "alex", passwords)
        token_b = signed_in(l1b, "casey", passwords)
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = [
                pool.submit(post, conn, path, csrf, json={"impact": "high", "urgency": "medium"})
                for conn, csrf in ((l1a, token_a), (l1b, token_b))
            ]
        assert sorted(future.result().status_code for future in results) == [200, 409]
        assert (
            query(
                "SELECT count(*) FROM desk.incident_audit_events "
                f"WHERE action = 'triaged' AND ticket_id = '{ticket_id}'"
            )
            == "1"
        )


def test_proxy_source_and_atomic_counter_race() -> None:
    name = "unknown-" + uuid4().hex

    def attempt(index: int) -> tuple[int, str | None]:
        with client() as connection:
            response = login(
                connection,
                name,
                "synthetic-password",
                {
                    "X-Desk-Client-Address": f"198.51.100.{index + 1}",
                    "X-Forwarded-For": f"203.0.113.{index + 1}",
                },
            )
            return response.status_code, response.headers.get("Retry-After")

    with ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(attempt, range(12)))
    assert sum(status == 429 for status, _ in results) == 7
    assert all(retry and int(retry) % 5 == 0 for status, retry in results if status == 429)
    assert all(status in (401, 429, 503) for status, _ in results)
    time.sleep(6.1)
    assert attempt(0)[0] == 401

    result = stack(
        "exec",
        "-T",
        "backend",
        "python",
        "-c",
        (
            "import urllib.request, urllib.error, sys; "
            "r=urllib.request.Request('http://127.0.0.1:8000/api/v1/auth/login',data=b'{}',"
            "headers={'Host':sys.argv[2],'Origin':sys.argv[1],'X-Desk-Request':'1',"
            "'X-Desk-Client-Address':'192.0.2.42','Content-Type':'application/json'});\n"
            "try: urllib.request.urlopen(r)\n"
            "except urllib.error.HTTPError as error: print(error.code)"
        ),
        str(ORIGIN),
        urlsplit(str(ORIGIN)).netloc,
    )
    assert result == "503"


def test_audit_failure_rolls_back_login_and_incident(passwords: dict[str, str]) -> None:
    before = query("SELECT count(*) FROM desk.refresh_families")
    query(
        "ALTER TABLE desk.auth_audit_events ADD CONSTRAINT auth_test_deny CHECK (false) NOT VALID"
    )
    try:
        with client() as connection:
            result = login(connection, "jordan", passwords["jordan"])
            assert result.status_code == 500 and "set-cookie" not in result.headers
            assert "auth_test_deny" not in result.text
        assert query("SELECT count(*) FROM desk.refresh_families") == before
    finally:
        query("ALTER TABLE desk.auth_audit_events DROP CONSTRAINT auth_test_deny")
    before = query("SELECT count(*) FROM desk.tickets")
    with client() as employee:
        csrf = signed_in(employee, "jordan", passwords)
        query(
            "ALTER TABLE desk.incident_audit_events "
            "ADD CONSTRAINT incident_test_deny CHECK (false) NOT VALID"
        )
        try:
            failed = post(
                employee,
                INCIDENTS,
                csrf,
                json={"summary": "Audit rollback", "description": "Synthetic"},
            )
            assert failed.status_code == 500 and "incident_test_deny" not in failed.text
            assert query("SELECT count(*) FROM desk.tickets") == before
        finally:
            query("ALTER TABLE desk.incident_audit_events DROP CONSTRAINT incident_test_deny")


def test_redis_loss_recovery_and_postgres_outage(passwords: dict[str, str]) -> None:
    with client() as connection:
        csrf = signed_in(connection, "mina", passwords)
        stack("stop", "--timeout", "0", "redis")
        try:
            assert connection.get(AUTH + "/me").status_code == 200
            assert connection.get("/api/health/redis").status_code == 503
            assert connection.get("/api/health/ready").status_code == 200
            assert post(connection, AUTH + "/refresh", csrf).status_code == 503
            assert login(connection, "maya", passwords["maya"]).status_code == 503
            assert post(connection, AUTH + "/logout", csrf).status_code == 204
        finally:
            stack("up", "-d", "--wait", "redis")
    wait_for_auth(passwords)
    stack("restart", "redis")
    with client() as connection:
        assert connection.get("/api/health/auth").status_code == 503
        assert login(connection, "maya", passwords["maya"]).status_code == 503
        stack("restart", "--timeout", "1", "backend")
        deadline = time.monotonic() + 35
        while connection.get("/api/health/ready").status_code != 200:
            assert time.monotonic() < deadline
            time.sleep(0.5)
        assert connection.get("/api/health/auth").status_code == 503
    wait_for_auth(passwords)

    with client() as connection:
        csrf = signed_in(connection, "mina", passwords)
        stack("stop", "--timeout", "1", "postgres")
        try:
            assert connection.get("/api/health/redis").status_code == 200
            assert connection.get(AUTH + "/me").status_code == 503
            failed = post(connection, AUTH + "/logout", csrf)
            assert failed.status_code == 503 and "set-cookie" not in failed.headers
        finally:
            stack("up", "-d", "--wait", "postgres")


def test_live_cookie_expiration_and_idle_deadline(passwords: dict[str, str]) -> None:
    with client() as connection:
        csrf = signed_in(connection, "riley", passwords)
        old_access = connection.cookies[ACCESS_COOKIE]
        time.sleep(ACCESS_SECONDS + 0.2)
        assert (
            connection.get(
                AUTH + "/me", headers={"Cookie": f"{ACCESS_COOKIE}={old_access}"}
            ).status_code
            == 401
        )
        response = connection.get(AUTH + "/csrf")
        assert response.status_code == 200 and response.json()["csrf_token"] == csrf
        assert post(connection, AUTH + "/refresh", csrf).status_code == 204
        refresh = connection.cookies[REFRESH_COOKIE]
        time.sleep(IDLE_SECONDS + 0.2)
        assert (
            connection.get(
                AUTH + "/csrf", headers={"Cookie": f"{REFRESH_COOKIE}={refresh}"}
            ).status_code
            == 401
        )
        old_cookie = {"Cookie": f"{REFRESH_COOKIE}={refresh}"}
        assert post(connection, AUTH + "/refresh", csrf, headers=old_cookie).status_code == 401
        assert post(connection, AUTH + "/logout", csrf, headers=old_cookie).status_code == 204

    with client() as connection:
        csrf = signed_in(connection, "casey", passwords)
        # Give this isolated fixture a near absolute deadline using PostgreSQL time.
        family_id = query(
            "SELECT f.id FROM desk.refresh_families f JOIN desk.users u ON f.user_id = u.id "
            "WHERE u.username = 'casey' ORDER BY f.authenticated_at DESC LIMIT 1"
        )
        query(
            "UPDATE desk.refresh_families "
            "SET absolute_expires_at = statement_timestamp() + interval '18 seconds', "
            "idle_expires_at = statement_timestamp() + interval '18 seconds' "
            f"WHERE id = '{family_id}'"
        )
        assert post(connection, AUTH + "/refresh", csrf).status_code == 204
        assert (
            query(
                "SELECT f.absolute_expires_at = f.idle_expires_at "
                "AND f.idle_expires_at = c.expires_at FROM desk.refresh_families f "
                "JOIN desk.refresh_credentials c ON f.id = c.family_id AND c.consumed_at IS NULL "
                f"WHERE f.id = '{family_id}'"
            )
            == "t"
        )
        refresh = connection.cookies[REFRESH_COOKIE]
        time.sleep(18.2)
        assert (
            post(
                connection,
                AUTH + "/refresh",
                csrf,
                headers={
                    "Cookie": f"{REFRESH_COOKIE}={refresh}",
                },
            ).status_code
            == 401
        )


def test_redis_memory_full_denies_issuance_and_runtime_acl_is_scoped(
    passwords: dict[str, str],
) -> None:
    result = stack(
        "exec",
        "-T",
        "redis",
        "sh",
        "-ec",
        (
            'export REDISCLI_AUTH="$(cat /run/secrets/desk_redis_password)"; '
            "redis-cli --user desk ACL LIST; redis-cli --user desk SET outside:limiter 1"
        ),
    )
    assert result.count("NOPERM") == 2

    password = Path(os.environ["DESK_AUTH_TEST_REDIS_ADMIN"]).read_text()

    def memory_limit(value: int) -> str:
        return stack(
            "exec",
            "-T",
            "redis",
            "sh",
            "-ec",
            "read -r REDISCLI_AUTH; export REDISCLI_AUTH; "
            'redis-cli --user desk_verification CONFIG SET maxmemory "$1"',
            "set-memory",
            str(value),
            stdin=password,
        )

    assert memory_limit(1) == "OK"
    try:
        with client() as connection:
            response = login(connection, "maya", passwords["maya"])
            assert response.status_code == 503 and "set-cookie" not in response.headers
    finally:
        assert memory_limit(64 * 1024 * 1024) == "OK"
        wait_for_auth(passwords)


def test_credentials_and_payloads_stay_out_of_operational_logs(
    passwords: dict[str, str],
) -> None:
    with client() as connection:
        csrf = signed_in(connection, "priya", passwords)
        access = connection.cookies[ACCESS_COOKIE]
        refresh = connection.cookies[REFRESH_COOKIE]
        description = f"Private synthetic evidence {uuid4()}"
        result = post(
            connection,
            INCIDENTS,
            csrf,
            json={
                "summary": "Log redaction probe",
                "description": description,
            },
        )
        assert result.status_code == 201
        logs = stack("logs", "--no-color", "backend", "frontend")
        assert all(secret not in logs for secret in (csrf, access, refresh, description))
        assert all(password not in logs for password in passwords.values())
