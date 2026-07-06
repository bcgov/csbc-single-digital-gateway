#!/bin/sh
# CI/CD job entrypoint for the @repo/database migrate/seed image. Runs to completion and exits
# (non-zero on failure), so a pipeline step / K8s Job / OpenShift pre-deploy hook can gate on it.
#
# Usage:  docker run --rm -e DATABASE_URL=postgres://… <image> [command]
#   migrate        apply all pending migrations                       (default)
#   seed           run the idempotent reference-data seed
#   migrate-seed   migrate, then seed
#   <anything>     executed verbatim (escape hatch, e.g. `sh`)
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set (target Postgres connection string)}"

# Precompiled (esbuild) scripts run with plain node — no tsx/toolchain in the runtime image.
cmd="${1:-migrate}"

case "$cmd" in
  migrate)      exec node dist-scripts/migrate.js ;;
  seed)         exec node dist-scripts/seed.js ;;
  migrate-seed) node dist-scripts/migrate.js && exec node dist-scripts/seed.js ;;
  *)            exec "$@" ;;
esac
