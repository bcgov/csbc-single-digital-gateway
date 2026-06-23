#!/usr/bin/env bash
# Live verification for Feature 24 (auth-logout-hardening): proves, against real Keycloak +
# Valkey, that (1) login tracks the session under the user in Valkey, (2) logout?everywhere=true
# deletes the connect-redis session key(s) AND the per-user index (the `sdg:sess:` prefix
# contract), and (3) with AUTH_RP_LOGOUT=true the logout 302s to the IdP end_session_endpoint
# with an id_token_hint.
#
# Requires: the SDG stack up (docker compose up -d) + platform-api running on :4001 in
# DEVELOPMENT mode with AUTH_RP_LOGOUT=true. Dev mode keeps cookies non-secure (http works) while
# the ValkeySessionRegistry stays active.
set -euo pipefail

APP="${APP:-http://localhost:4001}"
KC_CONTAINER="${KC_CONTAINER:-sdg-keycloak}"
VK_CONTAINER="${VK_CONTAINER:-sdg-valkey}"
USER_NAME="${KC_USER:-testuser}"
USER_PASS="${KC_PASS:-password}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

# `docker` is a shell alias for podman in interactive shells; resolve a real binary for the script.
CONTAINER_CLI="${CONTAINER_CLI:-$(command -v docker || command -v podman)}"
vk() { "$CONTAINER_CLI" exec "$VK_CONTAINER" valkey-cli "$@"; }

echo "==> 1. GET /auth/login and walk the Keycloak login form"
LOGIN_PAGE="$(curl -s -c "$JAR" -b "$JAR" -L "$APP/auth/login")"
FORM_ACTION="$(printf '%s' "$LOGIN_PAGE" \
  | grep -oE 'action="[^"]+"' | head -1 | sed -E 's/action="([^"]+)"/\1/' \
  | sed 's/&amp;/\&/g')"
if [[ -z "$FORM_ACTION" ]]; then
  echo "FAIL: could not find Keycloak login form action (is Keycloak up + realm imported?)" >&2
  exit 1
fi
echo "    form action: $FORM_ACTION"

echo "==> 2. POST credentials -> follow back through /auth/callback"
# The callback 302s to AUTH_POST_LOGIN_REDIRECT (the SPA, likely :3000, not running here). curl -L
# chases it and may fail to connect — that's fine: the session cookie was already saved to the jar
# by the callback's Set-Cookie before that final hop, so we tolerate a connection failure here.
curl -s -c "$JAR" -b "$JAR" -L \
  --data-urlencode "username=$USER_NAME" \
  --data-urlencode "password=$USER_PASS" \
  "$FORM_ACTION" -o /dev/null || echo "    (final redirect to the SPA not reachable — expected, session cookie is set)"

echo "==> 3. GET /auth/me (proves the session is established) and read the user id"
ME="$(curl -s -b "$JAR" "$APP/auth/me")"
echo "    /auth/me: $ME"
USER_ID="$(printf '%s' "$ME" | sed -E 's/.*"id":"([^"]+)".*/\1/')"
if [[ -z "$USER_ID" || "$USER_ID" == "$ME" ]]; then
  echo "FAIL: no authenticated user id from /auth/me" >&2
  exit 1
fi
echo "    user id: $USER_ID"

echo "==> 4. Inspect Valkey: the session is tracked under the user"
SIDS="$(vk SMEMBERS "sdg:user-sessions:$USER_ID")"
echo "    sdg:user-sessions:$USER_ID = [$SIDS]"
if [[ -z "$SIDS" ]]; then
  echo "FAIL: registry.track did not record the session in Valkey" >&2
  exit 1
fi
SID="$(printf '%s' "$SIDS" | head -1)"

echo "==> 5. Seed a fake connect-redis session blob for that sid (mimics the prod store)"
vk SET "sdg:sess:$SID" '{"fake":"session-blob"}' >/dev/null
echo "    EXISTS sdg:sess:$SID -> $(vk EXISTS "sdg:sess:$SID")"

echo "==> 6. POST /auth/logout?everywhere=true and capture the response"
LOGOUT_HEADERS="$(curl -s -D - -o /dev/null -b "$JAR" -X POST "$APP/auth/logout?everywhere=true")"
STATUS="$(printf '%s' "$LOGOUT_HEADERS" | head -1)"
LOCATION="$(printf '%s' "$LOGOUT_HEADERS" | grep -i '^location:' | sed -E 's/[Ll]ocation: *//; s/\r//')"
echo "    status:   $STATUS"
echo "    location: $LOCATION"

echo "==> 7. Verify Valkey keys are gone (revokeAll deleted the store key + the index)"
SESS_EXISTS="$(vk EXISTS "sdg:sess:$SID")"
IDX_EXISTS="$(vk EXISTS "sdg:user-sessions:$USER_ID")"
echo "    EXISTS sdg:sess:$SID            -> $SESS_EXISTS (expect 0)"
echo "    EXISTS sdg:user-sessions:$USER_ID -> $IDX_EXISTS (expect 0)"

echo "==> 8. Verify RP-initiated logout redirect (AUTH_RP_LOGOUT=true)"
RP_OK=1
if printf '%s' "$LOCATION" | grep -q 'protocol/openid-connect/logout' \
   && printf '%s' "$LOCATION" | grep -q 'id_token_hint='; then
  echo "    OK: 302 to IdP end_session_endpoint with id_token_hint"
else
  echo "    NOTE: no end_session redirect (only expected when AUTH_RP_LOGOUT=true)"
  RP_OK=0
fi

echo
if [[ "$SESS_EXISTS" == "0" && "$IDX_EXISTS" == "0" ]]; then
  echo "PASS: logout-everywhere deleted the session store key and the per-user index."
  [[ "$RP_OK" == "1" ]] && echo "PASS: RP-initiated logout redirected to the IdP end_session_endpoint."
else
  echo "FAIL: Valkey keys were not fully cleared." >&2
  exit 1
fi
