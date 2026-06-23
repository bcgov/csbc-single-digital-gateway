#!/usr/bin/env bash
# Live verification for Feature 25 (auth-csrf-state-hardening): proves the CSRF Origin guard is
# wired into the running app. Mutating requests are rejected unless their Origin is allowlisted
# (AUTH_ALLOWED_ORIGINS, default http://localhost:3000); safe methods bypass the check.
#
# Requires: platform-api running on :4001 with the rebuilt @repo/nestjs (restart the dev server).
# No login needed — the CSRF check runs before any session logic.
set -uo pipefail

APP="${APP:-http://localhost:4001}"
ALLOWED="${ALLOWED_ORIGIN:-http://localhost:3000}"

code() { # method, [origin]
  local method="$1" origin="${2:-}"
  if [[ -n "$origin" ]]; then
    curl -s -o /dev/null -w '%{http_code}' -X "$method" -H "Origin: $origin" "$APP/auth/logout"
  else
    curl -s -o /dev/null -w '%{http_code}' -X "$method" "$APP/auth/logout"
  fi
}

pass=0
fail=0
check() { # label, expected-regex, actual
  if [[ "$3" =~ $2 ]]; then echo "  PASS  $1 -> $3"; pass=$((pass + 1));
  else echo "  FAIL  $1 -> $3 (expected $2)"; fail=$((fail + 1)); fi
}

echo "==> CSRF Origin guard on POST /auth/logout (allowlist: $ALLOWED)"
check "no Origin (mutating, fail-closed)" '^403$' "$(code POST)"
check "foreign Origin (evil.com)"         '^403$' "$(code POST https://evil.com)"
check "allowlisted Origin"                '^(204|302)$' "$(code POST "$ALLOWED")"

echo "==> Safe methods bypass the CSRF check"
# GET /auth/login with no Origin must NOT be 403 — it 302s to the IdP.
check "GET /auth/login (no Origin)" '^30[0-9]$' \
  "$(curl -s -o /dev/null -w '%{http_code}' "$APP/auth/login")"

echo
if [[ "$fail" -eq 0 ]]; then
  echo "PASS: CSRF Origin guard rejects forged/absent origins, allows the allowlist, ignores safe methods. ($pass checks)"
else
  echo "FAIL: $fail check(s) failed." >&2
  exit 1
fi
