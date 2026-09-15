#!/usr/bin/env bash
# Adds missing cross-platform native dependency entries to package-lock.json.
#
# npm only records optional dependency entries for the HOST platform. When the
# lockfile is generated on macOS, Linux entries (needed by Alpine Docker builds)
# are missing. This script generates a complete lockfile on Alpine and merges
# the missing platform entries into the current lockfile — no version drift.
#
# See: https://github.com/npm/cli/issues/4828

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "Step 1/4: Generating Alpine lockfile via Docker…"

cat > "$TMPDIR/Dockerfile" <<'DOCKERFILE'
FROM node:24-alpine
WORKDIR /app
COPY package.json .
COPY apps/citizen-portal-api/package.json apps/citizen-portal-api/
COPY apps/citizen-portal-web/package.json apps/citizen-portal-web/
COPY apps/notification-service/package.json apps/notification-service/
COPY apps/platform-api/package.json apps/platform-api/
COPY apps/platform-web/package.json apps/platform-web/
COPY packages/database/package.json packages/database/
COPY packages/emails/package.json packages/emails/
COPY packages/nestjs/package.json packages/nestjs/
COPY packages/notification-database/package.json packages/notification-database/
COPY packages/react/package.json packages/react/
COPY packages/ui/package.json packages/ui/
RUN npm install --package-lock-only --ignore-scripts
DOCKERFILE

docker build --no-cache -q -f "$TMPDIR/Dockerfile" -t lockfile-gen-tmp . >/dev/null

echo "Step 2/4: Extracting Alpine lockfile…"
docker run --rm lockfile-gen-tmp cat package-lock.json > "$TMPDIR/lockfile-alpine.json"
docker rmi lockfile-gen-tmp >/dev/null 2>&1 || true

echo "Step 3/4: Merging missing platform entries…"
node scripts/merge-lockfile-platforms.mjs package-lock.json "$TMPDIR/lockfile-alpine.json"

echo "Step 4/4: Validating…"
node scripts/check-lockfile-platforms.mjs

echo ""
echo "Done. Commit the updated package-lock.json."
