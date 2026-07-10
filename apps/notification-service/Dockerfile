# syntax=docker/dockerfile:1
#
# Multi-stage production image for notification-service (internal API + workers, port 4002).
# Build from the MONOREPO ROOT so the turbo pruner can read the whole workspace graph:
#
#   docker build -f apps/notification-service/Dockerfile -t notification-service:local .
#
# Structurally identical to the *-api images (see .mdd/docs/72-platform-api-dockerfile.md);
# the only differences are the port and the workspace deps copied into the runner
# (@repo/notification-database + @repo/emails instead of @repo/database).

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
# pruner — isolate the minimal workspace subset for notification-service.
# ---------------------------------------------------------------------------
FROM base AS pruner
COPY . .
RUN turbo prune notification-service --docker

# ---------------------------------------------------------------------------
# builder — install (dev deps needed to build), compile the packages, then
# strip dev deps in place so the runner copies a production-only node_modules.
# --ignore-scripts: the root `prepare` (lefthook install) needs a git repo the
# build context doesn't have; no prod dependency relies on an install script.
# ---------------------------------------------------------------------------
FROM base AS builder

# `npm install` (not `npm ci`): turbo prune rewrites the npm lockfile and drops some
# deeply-nested optional entries, so strict `npm ci` rejects it as out of sync.
COPY --from=pruner /app/out/json/ .
RUN npm install --ignore-scripts

COPY --from=pruner /app/out/full/ .
# turbo prune omits root-level shared config (it belongs to no workspace), but every
# package's tsconfig extends ../../tsconfig.base.json — provide it for the build.
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN turbo run build --filter=notification-service

# Drop dev dependencies from node_modules; keep the @repo/* workspace symlinks.
RUN npm prune --omit=dev --ignore-scripts

# ---------------------------------------------------------------------------
# runner — minimal production runtime. Non-root, tini as PID 1, prod deps only.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4002

# Production node_modules (with @repo/* symlinks) from the builder.
COPY --from=builder --chown=node:0 /app/node_modules ./node_modules
COPY --from=builder --chown=node:0 /app/package.json ./package.json

# Built workspace deps — the @repo/* symlinks in node_modules resolve to these.
COPY --from=builder --chown=node:0 /app/packages/nestjs/package.json ./packages/nestjs/package.json
COPY --from=builder --chown=node:0 /app/packages/nestjs/dist ./packages/nestjs/dist
COPY --from=builder --chown=node:0 /app/packages/notification-database/package.json ./packages/notification-database/package.json
COPY --from=builder --chown=node:0 /app/packages/notification-database/dist ./packages/notification-database/dist
COPY --from=builder --chown=node:0 /app/packages/emails/package.json ./packages/emails/package.json
COPY --from=builder --chown=node:0 /app/packages/emails/dist ./packages/emails/dist

# The application itself.
COPY --from=builder --chown=node:0 /app/apps/notification-service/package.json ./apps/notification-service/package.json
COPY --from=builder --chown=node:0 /app/apps/notification-service/dist ./apps/notification-service/dist

# OpenShift/K8s hardening: restricted-v2 runs an arbitrary UID with GID 0 — group-own by
# root and rely on npm's default group read+traverse perms (no recursive chmod layer).
# Numeric UID so the runAsNonRoot admission check can verify a non-zero user.
USER 1000
EXPOSE 4002

# Liveness against the public /health/live endpoint (never pings the DB or SMTP).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4002)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tini reaps zombies and forwards SIGTERM/SIGINT so enableShutdownHooks() drains the pg
# pool and the email worker finishes its in-flight tick (graceful exit 143).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/notification-service/dist/src/main.js"]
