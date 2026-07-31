#!/bin/sh
# CI/CD job entrypoint for the @repo/database migrate/seed image. Runs to completion and exits
# (non-zero on failure), so a pipeline step / K8s Job / OpenShift pre-deploy hook can gate on it.
#
# Usage:  docker run --rm -e DATABASE_URL=postgres://… <image> [command]
#   migrate            apply all pending migrations                       (default)
#   seed               run the idempotent reference-data seed (document types)
#   seed-geo           import the geographic reference data (countries/states/cities, feature 152).
#                      Fetches ~53MB JSON from GitHub at runtime — needs egress to
#                      raw.githubusercontent.com and ~512Mi memory (parses a 46MB file).
#   migrate-seed       migrate, then seed
#   migrate-seed-geo   migrate, then seed, then seed-geo (full reference-data deploy)
#   <anything>         executed verbatim (escape hatch, e.g. `sh`)
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set (target Postgres connection string)}"

# Precompiled (esbuild) scripts run with plain node — no tsx/toolchain in the runtime image.
cmd="${1:-migrate}"

case "$cmd" in
  migrate)          exec node dist-scripts/migrate.js ;;
  seed)             exec node dist-scripts/seed.js ;;
  seed-geo)         exec node dist-scripts/geo-import.js ;;
  migrate-seed)     node dist-scripts/migrate.js && exec node dist-scripts/seed.js ;;
  migrate-seed-geo) node dist-scripts/migrate.js \
                      && node dist-scripts/seed.js \
                      && exec node dist-scripts/geo-import.js ;;
  *)                exec "$@" ;;
esac
