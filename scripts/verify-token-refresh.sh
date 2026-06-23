#!/usr/bin/env bash
# Live verification for Feature 23 (auth-token-refresh): proves lazy refresh + fail-closed
# revocation propagation against real Keycloak. With a huge AUTH_TOKEN_REFRESH_SKEW_SECONDS every
# authenticated request refreshes the access token; once the IdP session is revoked, that refresh
# fails and the BFF session is destroyed (401).
#
# Requires: the SDG stack up + platform-api running on :4001 in DEVELOPMENT mode with a large skew:
#   AUTH_TOKEN_REFRESH_SKEW_SECONDS=100000 AUTH_RP_LOGOUT=false npm run dev -w platform-api
set -uo pipefail

APP="${APP:-http://localhost:4001}"
KC="${KC:-http://localhost:8080}"
REALM="${REALM:-sdg}"
USER_NAME="${KC_USER:-testuser}"
USER_PASS="${KC_PASS:-password}"
KC_ADMIN="${KC_ADMIN:-admin}"
KC_ADMIN_PASS="${KC_ADMIN_PASS:-admin}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

echo "==> 1. Log in (walk the Keycloak form)"
PAGE="$(curl -s -c "$JAR" -b "$JAR" -L "$APP/auth/login")"
ACTION="$(printf '%s' "$PAGE" | grep -oE 'action="[^"]+"' | head -1 | sed -E 's/action="([^"]+)"/\1/; s/&amp;/\&/g')"
[ -z "$ACTION" ] && { echo "FAIL: no Keycloak form (IdP up?)" >&2; exit 1; }
curl -s -c "$JAR" -b "$JAR" -L --data-urlencode "username=$USER_NAME" \
  --data-urlencode "password=$USER_PASS" "$ACTION" -o /dev/null \
  || echo "    (final SPA redirect unreachable — expected)"

echo "==> 2. /auth/me (token still valid; guard refreshes on every request under the huge skew)"
ME="$(curl -s -b "$JAR" -w '\n%{http_code}' "$APP/auth/me")"
ME_BODY="$(printf '%s' "$ME" | head -n1)"; ME_CODE="$(printf '%s' "$ME" | tail -n1)"
echo "    status: $ME_CODE"
SUB="$(printf '%s' "$ME_BODY" | sed -E 's/.*"sub":"([^"]+)".*/\1/')"
[ "$ME_CODE" = "200" ] || { echo "FAIL: expected 200 after login (refresh should have succeeded)" >&2; exit 1; }
echo "    keycloak sub: $SUB"

echo "==> 3. A second /auth/me — still 200 (repeated successful refresh)"
C2="$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$APP/auth/me")"
echo "    status: $C2"

echo "==> 4. Revoke the user's IdP sessions (Keycloak admin: logout all sessions)"
ADMIN_TOKEN="$(curl -s -X POST "$KC/realms/master/protocol/openid-connect/token" \
  -d grant_type=password -d client_id=admin-cli \
  -d "username=$KC_ADMIN" -d "password=$KC_ADMIN_PASS" | sed -E 's/.*"access_token":"([^"]+)".*/\1/')"
[ -z "$ADMIN_TOKEN" ] && { echo "FAIL: could not get Keycloak admin token" >&2; exit 1; }
RC="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$KC/admin/realms/$REALM/users/$SUB/logout" \
  -H "Authorization: Bearer $ADMIN_TOKEN")"
echo "    admin logout HTTP: $RC (204 = sessions revoked)"

echo "==> 5. /auth/me again — refresh now fails → fail-closed 401"
FINAL="$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$APP/auth/me")"
echo "    status: $FINAL"

echo
if [ "$ME_CODE" = "200" ] && [ "$C2" = "200" ] && [ "$FINAL" = "401" ]; then
  echo "PASS: access token refreshed on each request; revoking the IdP session forced a fail-closed 401."
else
  echo "FAIL: expected 200, 200, then 401 — got $ME_CODE, $C2, $FINAL." >&2
  exit 1
fi
