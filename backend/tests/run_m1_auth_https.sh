#!/usr/bin/env bash
# End-to-end, including deliberately stopping dependencies in a disposable Compose project.
set -euo pipefail
umask 077
root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"
scratch=$(mktemp -d)
export DESK_AUTH_TEST_PROJECT="service-desk-auth-test-$$"
export DESK_HTTPS_PORT="${DESK_AUTH_TEST_PORT:-18443}"
export DESK_AUTH_ORIGIN="https://localhost:$DESK_HTTPS_PORT"
octet=$((100 + RANDOM % 100))
export DESK_AUTH_PROXY_SUBNET="172.29.$octet.0/24"
export DESK_AUTH_PROXY_PEER="172.29.$octet.2"
export DESK_AUTH_TEST_ORIGIN="$DESK_AUTH_ORIGIN"
export DESK_AUTH_TEST_ACCESS_SECONDS=12
export DESK_AUTH_TEST_IDLE_SECONDS=26
local_secrets="${DESK_LOCAL_SECRET_DIR:-$root/.local}"
export DESK_AUTH_TEST_CERT="$local_secrets/local-tls.crt"
export DESK_AUTH_TEST_PASSWORD_FILE="$scratch/passwords.json"
export DESK_AUTH_TEST_OVERLAY="$scratch/auth-tests.yaml"
test_stack=(docker compose --project-name "$DESK_AUTH_TEST_PROJECT" -f "$root/compose.yaml")
if [[ "${DESK_AUTH_TEST_VITE:-0}" == 1 ]]; then
  test_stack+=(-f "$root/compose.dev.yaml")
fi
test_stack+=(-f "$DESK_AUTH_TEST_OVERLAY")
cleanup() {
  "${test_stack[@]}" down --volumes --remove-orphans >/dev/null || true
  rm -rf -- "$scratch"
}
trap cleanup EXIT

write_test_settings() {
  cat > "$DESK_AUTH_TEST_OVERLAY" <<YAML
services:
  backend:
    environment:
      DESK_AUTH_ACCESS_SECONDS: "$1"
      DESK_AUTH_IDLE_SECONDS: "$2"
      DESK_AUTH_ABSOLUTE_SECONDS: "$3"
      DESK_AUTH_ADMISSION_WINDOW_SECONDS: "4"
      DESK_AUTH_LOGIN_WINDOW_SECONDS: "6"
      DESK_AUTH_RECOVERY_SECONDS: "6"
YAML
}

if [[ "${DESK_AUTH_TEST_BROWSER_ONLY:-0}" == 1 ]]; then
  write_test_settings "$DESK_AUTH_TEST_ACCESS_SECONDS" "$DESK_AUTH_TEST_IDLE_SECONDS" 50
else
  # Routine API checks include real container stops and SQL assertions. Give
  # those checks time to complete before switching to the expiry test settings.
  write_test_settings 120 160 240
fi

python3 scripts/setup_local.py
export DESK_LOCAL_SECRET_DIR="$scratch/secrets"
install -d -m 0700 "$DESK_LOCAL_SECRET_DIR"
install -m 0644 "$local_secrets/local-tls.crt" "$local_secrets/local-tls.key" "$DESK_LOCAL_SECRET_DIR"
python3 scripts/setup_local.py
# Add a disposable configuration-only identity for the real Redis OOM check.
export DESK_AUTH_TEST_REDIS_ADMIN="$scratch/redis-verification"
python3 - <<'PYREDIS'
import hashlib
import os
import secrets
from pathlib import Path
password = secrets.token_urlsafe(32)
Path(os.environ["DESK_AUTH_TEST_REDIS_ADMIN"]).write_text(password + "\n")
acl = Path(os.environ["DESK_LOCAL_SECRET_DIR"]) / "redis_acl"
digest = hashlib.sha256(password.encode()).hexdigest()
with acl.open("a") as output:
    output.write(f"user desk_verification on #{digest} -@all +config|set\n")
PYREDIS
if command -v mkcert >/dev/null && [[ -f "$(mkcert -CAROOT)/rootCA.pem" ]]; then
  export DESK_AUTH_TEST_CA="${DESK_AUTH_TEST_CA:-$(mkcert -CAROOT)/rootCA.pem}"
fi
# Chromium pins the specific local certificate key if absent from its trust store.
# The API suite independently verifies the full TLS handshake and hostname.
export DESK_AUTH_TEST_BROWSER_SPKI=$(openssl x509 -in "$DESK_AUTH_TEST_CERT" -pubkey -noout |
  openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | openssl base64 -A)
"${test_stack[@]}" build frontend backend
"${test_stack[@]}" up -d --wait --wait-timeout 90 postgres redis
"${test_stack[@]}" --profile tools run --rm migrate
"${test_stack[@]}" exec -T postgres psql -X -U postgres -d service_desk -v ON_ERROR_STOP=1 \
  -c "COMMENT ON DATABASE service_desk IS 'service-desk-development-seed';"
(
  cd backend
  uv run --locked --no-sync python -c 'import json, secrets; from app.seed import PERSONAS
print(json.dumps({name: secrets.token_urlsafe(24) for name, _, _ in PERSONAS}))'
) > "$DESK_AUTH_TEST_PASSWORD_FILE"
"${test_stack[@]}" --profile tools run -T --rm migrate python -m app.seed --development \
  < "$DESK_AUTH_TEST_PASSWORD_FILE"
"${test_stack[@]}" up -d --wait --wait-timeout 90 backend frontend
if [[ "${DESK_AUTH_TEST_BROWSER_ONLY:-0}" == 1 ]]; then
  (
    cd backend
    uv run --locked --no-sync pytest -q tests/test_auth_https.py::test_https_and_limiter_initialization
  )
else
  (
    cd backend
    uv run --locked --no-sync pytest -q tests/test_auth_security.py tests/test_auth_https.py \
      -k 'not test_live_cookie_expiration_and_idle_deadline'
  )
  write_test_settings "$DESK_AUTH_TEST_ACCESS_SECONDS" "$DESK_AUTH_TEST_IDLE_SECONDS" 50
  "${test_stack[@]}" up -d --wait --force-recreate backend
  (
    cd backend
    uv run --locked --no-sync pytest -q tests/test_auth_https.py::test_live_cookie_expiration_and_idle_deadline
  )
fi
(
  cd frontend
  node node_modules/@playwright/test/cli.js test
)
