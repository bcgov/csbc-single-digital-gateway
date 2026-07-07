# syntax=docker/dockerfile:1
#
# Multi-stage production image for citizen-portal-api (NestJS BFF, port 4000).
# Build from the MONOREPO ROOT so the turbo pruner can read the whole workspace graph:
#
#   docker build -f apps/citizen-portal-api/Dockerfile -t citizen-portal-api:local .
#
# Structurally identical to apps/platform-api/Dockerfile (the *-api apps differ only by
# config). See .mdd/docs/72-platform-api-dockerfile.md for the full rationale.

ARG NODE_IMAGE=node:24-alpine
ARG TURBO_VERSION=2.9.18

# ---------------------------------------------------------------------------
# base — shared foundation: tini for PID-1 signal handling + pinned turbo.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ARG TURBO_VERSION
RUN apk add --no-cache tini \
    && npm install --global turbo@${TURBO_VERSION}
WORKDIR /app

# ---------------------------------------------------------------------------
# pruner — isolate the minimal workspace subset for citizen-portal-api.
#   out/json = package.json files + pruned package-lock.json (cache-friendly)
#   out/full = the subset's full source
# ---------------------------------------------------------------------------
FROM base AS pruner
COPY . .
RUN turbo prune citizen-portal-api --docker

# ---------------------------------------------------------------------------
# builder — install (dev deps needed to build), compile the 3 packages, then
# strip dev deps in place so the runner copies a production-only node_modules.
# --ignore-scripts: the root `prepare` (lefthook install) needs a git repo the
# build context doesn't have; no prod dependency relies on an install script.
# ---------------------------------------------------------------------------
FROM base AS builder

# Install against the pruned lockfile first — this layer is cached until a
# dependency changes, independent of source edits.
#
# `npm install` (not `npm ci`): turbo prune rewrites the npm lockfile and drops
# some deeply-nested optional entries (e.g. @rolldown/binding-wasm32-wasi's
# @emnapi/* wasm-fallback deps, pulled in by @repo/database's Vite 8 build), so
# strict `npm ci` rejects the pruned lockfile as out of sync. `npm install` still
# honours every pinned version present and just reconciles the missing optionals.
COPY --from=pruner /app/out/json/ .
RUN npm install --ignore-scripts

# Bring in the pruned source and build citizen-portal-api (+ ^build deps: @repo/nestjs,
# @repo/database) via turbo.
COPY --from=pruner /app/out/full/ .
# turbo prune omits root-level shared config (it belongs to no workspace), but every
# package's tsconfig extends ../../tsconfig.base.json — provide it for the build.
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN turbo run build --filter=citizen-portal-api

# Drop dev dependencies from node_modules; keep the @repo/* workspace symlinks.
RUN npm prune --omit=dev --ignore-scripts

# ---------------------------------------------------------------------------
# runner — minimal production runtime. Non-root, tini as PID 1, prod deps only.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

# Production node_modules (with @repo/* symlinks) from the builder.
COPY --from=builder --chown=node:0 /app/node_modules ./node_modules
COPY --from=builder --chown=node:0 /app/package.json ./package.json

# Built workspace deps — the @repo/* symlinks in node_modules resolve to these.
COPY --from=builder --chown=node:0 /app/packages/nestjs/package.json ./packages/nestjs/package.json
COPY --from=builder --chown=node:0 /app/packages/nestjs/dist ./packages/nestjs/dist
COPY --from=builder --chown=node:0 /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder --chown=node:0 /app/packages/database/dist ./packages/database/dist

# The application itself.
COPY --from=builder --chown=node:0 /app/apps/citizen-portal-api/package.json ./apps/citizen-portal-api/package.json
COPY --from=builder --chown=node:0 /app/apps/citizen-portal-api/dist ./apps/citizen-portal-api/dist

# OpenShift/K8s hardening: the `restricted-v2` SCC runs the container as an arbitrary
# assigned UID with GID 0. The COPYs above group-own everything by root (`--chown=…:0`)
# and npm's default perms already grant the group read+traverse, so any assigned UID can
# read the app. (No `chmod -R g=u` — these APIs write nothing under /app at runtime, and a
# recursive chmod would duplicate the whole tree into an extra layer, ~70MB of node_modules.)
#
# Numeric UID (not the `node` name): the K8s/OpenShift `runAsNonRoot` admission check can
# only verify a non-zero user when USER is numeric. 1000 == the alpine image's `node` user.
USER 1000
EXPOSE 4000

# Liveness against the public /health/live endpoint (never pings DB/Valkey).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tini reaps zombies and forwards SIGTERM/SIGINT so enableShutdownHooks() drains
# the pg pool + Valkey client (graceful exit 143).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/citizen-portal-api/dist/src/main.js"]
