"""Verify the loopback HTTPS entry point against real running Compose services."""

import argparse
import json
from http.client import HTTPResponse
from urllib.error import HTTPError
from urllib.request import urlopen
from uuid import UUID


def request(origin: str, path: str) -> tuple[int, str | None, bytes]:
    response: HTTPResponse
    try:
        response = urlopen(origin + path, timeout=5)
    except HTTPError as exc:
        with exc:
            return exc.code, exc.headers.get("X-Request-ID"), exc.read()
    with response:
        return response.status, response.headers.get("X-Request-ID"), response.read()


def check(port: int, swagger: bool) -> None:
    origin = f"https://localhost:{port}"
    for name in ("live", "ready", "redis"):
        status, header, body = request(origin, f"/api/health/{name}")
        if status != 200 or json.loads(body) != {"status": "ok"} or not header:
            raise SystemExit(f"API health check {name} failed with HTTP {status}.")
        UUID(header)
    status, header, body = request(origin, "/api/__verification_missing__")
    if status != 404 or not header or json.loads(body).get("request_id") != header:
        raise SystemExit("The API did not return a correlated 404.")
    status, _, body = request(origin, "/portal/tickets")
    if status != 200 or b'id="root"' not in body:
        raise SystemExit("Frontend SPA fallback did not return the expected page.")
    status, _, body = request(origin, "/api/docs")
    if swagger:
        assets = "/api/docs/assets/swagger-ui-bundle.js"
        if status != 200 or assets.encode() not in body or request(origin, assets)[0] != 200:
            raise SystemExit("Swagger UI or its local JavaScript bundle is unavailable.")
        status, _, body = request(origin, "/api/openapi.json")
        if status != 200 or "/api/health/live" not in json.loads(body)["paths"]:
            raise SystemExit("Swagger OpenAPI schema is unavailable.")
    elif status != 404:
        raise SystemExit("Swagger must be disabled for this verification mode.")
    print("HTTPS entry point, API routing, PostgreSQL, Redis, SPA fallback, and docs mode passed.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8443)
    parser.add_argument("--swagger", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    check(args.port, args.swagger)


if __name__ == "__main__":
    main()
