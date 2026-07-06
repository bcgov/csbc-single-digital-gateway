#!/bin/sh
# Render the runtime SPA config (window.__APP_CONFIG__) consumed by src/lib/bff.ts, and fail-closed
# on the two required env vars. nginxinc/nginx-unprivileged runs every /docker-entrypoint.d/*.sh
# before starting nginx (after 20-envsubst-on-templates.sh has rendered the nginx config).
set -eu

# Fail-closed: refuse to start without the same-origin BFF path the SPA calls (normally /api) rather
# than silently serving a SPA that points at localhost.
: "${BFF_ORIGIN:?BFF_ORIGIN must be set — the same-origin BFF path the SPA calls, e.g. /api}"
# API_UPSTREAM is the host:port nginx reverse-proxies /api/* to (the platform-api Service); it is
# substituted into the nginx config by 20-envsubst-on-templates.sh. Guard it for a clear error.
: "${API_UPSTREAM:?API_UPSTREAM must be set — the BFF Service nginx proxies /api/* to, e.g. platform-api:4000}"

# Escape backslashes and double-quotes so the value can't break out of the JS string literal.
escaped=$(printf '%s' "$BFF_ORIGIN" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

target=/usr/share/nginx/html/config.js
printf 'window.__APP_CONFIG__ = { bffOrigin: "%s" };\n' "$escaped" > "$target"
echo "[40-render-runtime-config] rendered $target (bffOrigin=$BFF_ORIGIN, apiUpstream=$API_UPSTREAM)"
