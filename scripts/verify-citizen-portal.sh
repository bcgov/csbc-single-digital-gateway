#!/usr/bin/env bash
# Live verification for Feature 26 (citizen-portal-api). Proves, against the real citizens realm:
#   1. a citizen logs in via citizen-portal-api (:4000) and /auth/me shows roles ['citizen'],
#   2. the DB user is stamped roles {citizen} (not staff),
#   3. the session is tracked under the `cpa:` Valkey prefix (isolated from platform-api's `sdg:`).
#
# Requires: Keycloak restarted so keycloak/citizens-realm.json is imported; Postgres migrated;
# citizen-portal-api running on :4000 (cp .env.example .env first).
set -uo pipefail

APP="${APP:-http://localhost:4000}"
USER_NAME="${KC_USER:-citizen1}"
USER_PASS="${KC_PASS:-password}"
CLI="$(command -v docker || command -v podman)"
JAR="$(mktemp)"; trap 'rm -f "$JAR"' EXIT
fail=0

echo "==> 1. Log in via citizen-portal-api (citizens realm)"
PAGE="$(curl -s -c "$JAR" -b "$JAR" -L "$APP/auth/login")"
ACTION="$(printf '%s' "$PAGE" | grep -oE 'action="[^"]+"' | head -1 | sed -E 's/action="([^"]+)"/\1/; s/&amp;/\&/g')"
if ! printf '%s' "$ACTION" | grep -q '/realms/citizens/'; then
  echo "FAIL: login did not redirect to the citizens realm (got: ${ACTION:-none}). Is it imported?" >&2
  exit 1
fi
curl -s -c "$JAR" -b "$JAR" -L --data-urlencode "username=$USER_NAME" \
  --data-urlencode "password=$USER_PASS" "$ACTION" -o /dev/null \
  || echo "    (final SPA redirect unreachable — expected)"

echo "==> 2. /auth/me — roles should be exactly ['citizen']"
ME="$(curl -s -b "$JAR" "$APP/auth/me")"
echo "    $ME"
ROLES="$(printf '%s' "$ME" | sed -E 's/.*"roles":\[([^]]*)\].*/\1/')"
SUB="$(printf '%s' "$ME" | sed -E 's/.*"sub":"([^"]+)".*/\1/')"
if [ "$ROLES" = '"citizen"' ]; then echo "    PASS roles=[$ROLES]"; else echo "    FAIL roles=[$ROLES] (expected \"citizen\")" >&2; fail=1; fi

echo "==> 3. DB — the citizen's user row has roles {citizen}"
DB_ROLES="$("$CLI" exec sdg-postgres psql -U postgres -d sdg -tAc \
  "select u.roles from users u join identities i on i.user_id=u.id where i.issuer like '%/realms/citizens' and i.sub='$SUB' limit 1" 2>/dev/null | tr -d '[:space:]')"
echo "    users.roles = ${DB_ROLES:-<none>}"
if [ "$DB_ROLES" = '{citizen}' ]; then echo "    PASS"; else echo "    FAIL (expected {citizen})" >&2; fail=1; fi

echo "==> 4. Valkey — session indexed under the cpa: prefix (isolated from sdg:)"
CPA_KEYS="$("$CLI" exec sdg-valkey valkey-cli --scan --pattern 'cpa:user-sessions:*' 2>/dev/null | wc -l | tr -d ' ')"
echo "    cpa:user-sessions:* keys = $CPA_KEYS"
if [ "${CPA_KEYS:-0}" -ge 1 ]; then echo "    PASS (session tracked under cpa:)"; else echo "    FAIL (no cpa: keys — prefix not applied)" >&2; fail=1; fi

echo
if [ "$fail" = 0 ]; then
  echo "PASS: citizen logs in via the citizens realm, is stamped role 'citizen', and is session-isolated under cpa:."
else
  echo "FAIL: one or more checks failed." >&2; exit 1
fi
