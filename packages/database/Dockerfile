# syntax=docker/dockerfile:1
#
# CI/CD JOB image for @repo/database: applies migrations (and optionally seeds) then EXITS.
# This is NOT a long-running server — run it as a pipeline step, K8s Job, or OpenShift
# pre-deploy hook / init container.
#
# Build from the MONOREPO ROOT:
#   docker build -f packages/database/Dockerfile -t db-migrate:local .
# Run (DATABASE_URL required; the image runs to completion and exits 0/non-zero):
#   docker run --rm -e DATABASE_URL=postgres://user:pass@host:5432/db db-migrate:local              # migrate (default)
#   docker run --rm -e DATABASE_URL=postgres://…                     db-migrate:local seed
#   docker run --rm -e DATABASE_URL=postgres://…                     db-migrate:local migrate-seed
#   docker run --rm -e DATABASE_URL=postgres://…                     db-migrate:local migrate-seed-geo  # + geo reference data (needs egress + ~512Mi)
#
# See .mdd/docs/74-database-migrate-image.md for the rationale.

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
# pruner — @repo/database has no @repo/* deps, so the subset is just this package.
# ---------------------------------------------------------------------------
FROM base AS pruner
COPY . .
RUN turbo prune @repo/database --docker

# ---------------------------------------------------------------------------
# builder — full install (needs esbuild) then PRECOMPILE migrate.ts + seed.ts to plain JS
# (dist-scripts/). `npm install` (not ci) + --ignore-scripts: same turbo-prune lockfile /
# root-prepare gotchas as the app images (see doc 72).
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN npm install --ignore-scripts
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
# esbuild bundles the local TS (client + schema) and externalizes node_modules
# (drizzle-orm, pg, dotenv) → dist-scripts/{migrate,seed}.js run with plain node.
RUN npm run build:scripts -w @repo/database

# ---------------------------------------------------------------------------
# runner — PROD-ONLY deps (drizzle-orm, pg, dotenv) + compiled scripts + migrations.
# No tsx / drizzle-kit / vite in the final image.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache tini
WORKDIR /app

# Production dependencies only (drizzle-orm, pg, dotenv), installed from the pruned lockfile.
COPY --from=pruner --chown=1000:0 /app/out/json/ .
RUN npm install --omit=dev --ignore-scripts

# Compiled scripts + the raw SQL migrations they apply.
COPY --from=builder --chown=1000:0 /app/packages/database/dist-scripts ./packages/database/dist-scripts
COPY --from=builder --chown=1000:0 /app/packages/database/migrations ./packages/database/migrations
COPY --chown=1000:0 packages/database/docker/entrypoint.sh /usr/local/bin/db-entrypoint.sh
RUN chmod +x /usr/local/bin/db-entrypoint.sh

ENV NODE_ENV=production

# Run from the package dir so dist-scripts/ and migrations/ resolve; node_modules is hoisted
# at /app. OpenShift/K8s: numeric non-root USER; the job only READS the image FS
# (world-readable npm files), so any arbitrary assigned UID works — no tree-wide chmod.
WORKDIR /app/packages/database
USER 1000

# tini forwards signals so a cancelled pipeline step / Job terminates the migrate cleanly.
ENTRYPOINT ["/sbin/tini", "--", "db-entrypoint.sh"]
CMD ["migrate"]
