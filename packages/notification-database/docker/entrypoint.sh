#!/bin/sh
# CI/CD job entrypoint for the @repo/notification-database migrate image. Runs to completion
# and exits (non-zero on failure) so a pipeline step / K8s Job / pre-deploy hook can gate on it.
#
# Usage:  docker run --rm -e NOTIFICATION_DATABASE_URL=postgres://… <image> [command]
#   migrate     apply all pending migrations   (default)
#   <anything>  executed verbatim (escape hatch, e.g. `sh`)
#
# No seed command: this package has no reference data (recipients/preferences/notifications are
# all runtime rows).
set -eu

: "${NOTIFICATION_DATABASE_URL:?NOTIFICATION_DATABASE_URL must be set (target Postgres connection string)}"

cmd="${1:-migrate}"

case "$cmd" in
  migrate) exec node dist-scripts/migrate.js ;;
  *)       exec "$@" ;;
esac
