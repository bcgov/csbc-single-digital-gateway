# syntax=docker/dockerfile:1
#
# CI/CD JOB image for @repo/notification-database: applies migrations then EXITS.
# This is NOT a long-running server — run it as a pipeline step, K8s Job, or OpenShift
# pre-deploy hook / init container. The feature-74 pattern (see packages/database/Dockerfile
# and .mdd/docs/74-database-migrate-image.md) minus the seed command — this package has no
# reference data.
#
# Build from the MONOREPO ROOT:
#   docker build -f packages/notification-database/Dockerfile -t notification-db-migrate:local .
# Run (NOTIFICATION_DATABASE_URL required; exits 0/non-zero):
#   docker run --rm -e NOTIFICATION_DATABASE_URL=postgres://… notification-db-migrate:local

ARG NODE_IMAGE=node:24-alpine
ARG TURBO_VERSION=2.9.18

# ---------------------------------------------------------------------------
# base — tini for signal handling + pinned turbo for the pruner.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ARG TURBO_VERSION
RUN apk add --no-cache tini && npm install --global turbo@${TURBO_VERSION}
WORKDIR /app

# ---------------------------------------------------------------------------
# pruner — @repo/notification-database has no @repo/* deps; the subset is this package.
# ---------------------------------------------------------------------------
FROM base AS pruner
COPY . .
RUN turbo prune @repo/notification-database --docker

# ---------------------------------------------------------------------------
# builder — full install (needs esbuild) then PRECOMPILE migrate.ts to plain JS.
# `npm install` (not ci) + --ignore-scripts: the turbo-prune lockfile / root-prepare
# gotchas from doc 72 apply here too.
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN npm install --ignore-scripts
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
# esbuild bundles the local TS (client + schema) and externalizes node_modules
# (drizzle-orm, pg, dotenv) → dist-scripts/migrate.js runs with plain node.
RUN npm run build:scripts -w @repo/notification-database

# ---------------------------------------------------------------------------
# runner — PROD-ONLY deps (drizzle-orm, pg, dotenv) + compiled script + migrations.
# No tsx / drizzle-kit / vite in the final image.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache tini
WORKDIR /app

# Production dependencies only, installed from the pruned lockfile.
COPY --from=pruner --chown=1000:0 /app/out/json/ .
RUN npm install --omit=dev --ignore-scripts

# Compiled script + the raw SQL migrations it applies.
COPY --from=builder --chown=1000:0 /app/packages/notification-database/dist-scripts ./packages/notification-database/dist-scripts
COPY --from=builder --chown=1000:0 /app/packages/notification-database/migrations ./packages/notification-database/migrations
COPY --chown=1000:0 packages/notification-database/docker/entrypoint.sh /usr/local/bin/db-entrypoint.sh
RUN chmod +x /usr/local/bin/db-entrypoint.sh

ENV NODE_ENV=production

# Run from the package dir so dist-scripts/ and migrations/ resolve; node_modules is
# hoisted at /app. Numeric non-root USER; the job only reads the image FS.
WORKDIR /app/packages/notification-database
USER 1000

# tini forwards signals so a cancelled pipeline step / Job terminates the migrate cleanly.
ENTRYPOINT ["/sbin/tini", "--", "db-entrypoint.sh"]
CMD ["migrate"]
