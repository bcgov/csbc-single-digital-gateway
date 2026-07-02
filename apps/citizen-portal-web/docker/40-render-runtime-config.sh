#!/bin/sh
# Render the runtime SPA config (window.__APP_CONFIG__) consumed by src/lib/bff.ts.
# nginxinc/nginx-unprivileged runs every /docker-entrypoint.d/*.sh before starting nginx.
set -eu

# Fail-closed: refuse to start without an explicit BFF origin rather than silently serving a
# SPA that points at localhost. $BFF_ORIGIN is the browser-facing origin of citizen-portal-api.
: "${BFF_ORIGIN:?BFF_ORIGIN must be set — the origin of this app's BFF, e.g. https://portal-api.example.gov}"

# Escape backslashes and double-quotes so the value can't break out of the JS string literal.
escaped=$(printf '%s' "$BFF_ORIGIN" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

target=/usr/share/nginx/html/config.js
printf 'window.__APP_CONFIG__ = { bffOrigin: "%s" };\n' "$escaped" > "$target"
echo "[40-render-runtime-config] rendered $target (bffOrigin=$BFF_ORIGIN)"
