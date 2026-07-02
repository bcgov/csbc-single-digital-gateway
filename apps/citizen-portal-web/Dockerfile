# syntax=docker/dockerfile:1
#
# Multi-stage production image for citizen-portal-web (Vite SPA, served by nginx on :8080).
# Build from the MONOREPO ROOT:
#   docker build -f apps/citizen-portal-web/Dockerfile -t citizen-portal-web:local .
# Run — BFF_ORIGIN is REQUIRED at start (the browser-facing origin of citizen-portal-api):
#   docker run -p 8080:8080 -e BFF_ORIGIN=https://portal-api.example.gov citizen-portal-web:local
#
# See .mdd/docs/73-web-app-dockerfiles.md for the rationale.

ARG NODE_IMAGE=node:24-alpine
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.27-alpine
ARG TURBO_VERSION=2.9.18

# ---------------------------------------------------------------------------
# base — pinned turbo for the prune/build stages.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ARG TURBO_VERSION
RUN npm install --global turbo@${TURBO_VERSION}
WORKDIR /app

# ---------------------------------------------------------------------------
# pruner — minimal workspace subset for citizen-portal-web (app + @repo/ui + @repo/react).
# ---------------------------------------------------------------------------
FROM base AS pruner
COPY . .
RUN turbo prune citizen-portal-web --docker

# ---------------------------------------------------------------------------
# builder — install + build the SPA to static assets (apps/citizen-portal-web/dist).
# `npm install` (not ci): turbo prune's lockfile drops nested optional deps (see doc 72/73).
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN npm install --ignore-scripts
COPY --from=pruner /app/out/full/ .
# Root shared config is omitted by prune; @repo/ui + @repo/react tsconfigs extend it.
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
# Builds @repo/ui + @repo/react (^build) then the SPA → apps/citizen-portal-web/dist.
RUN turbo run build --filter=citizen-portal-web

# ---------------------------------------------------------------------------
# runner — nginx-unprivileged serving the static SPA on :8080 (no Node, no node_modules).
# ---------------------------------------------------------------------------
FROM ${NGINX_IMAGE} AS runner

COPY apps/citizen-portal-web/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/citizen-portal-web/docker/40-render-runtime-config.sh /docker-entrypoint.d/40-render-runtime-config.sh
COPY --from=builder /app/apps/citizen-portal-web/dist /usr/share/nginx/html

# OpenShift/K8s hardening: the SCC runs the container as an arbitrary assigned UID with GID 0.
# The entrypoint writes config.js into the html dir at runtime and nginx writes temp files to
# its cache dir, so group-own (GID 0) + group-write the paths the runtime touches. USER stays
# numeric (101, the image default) for the runAsNonRoot admission check. /tmp (pid file) is
# already world-writable.
USER root
RUN chmod +x /docker-entrypoint.d/40-render-runtime-config.sh \
    && chgrp -R 0 /usr/share/nginx/html /var/cache/nginx /etc/nginx \
    && chmod -R g+rwX /usr/share/nginx/html /var/cache/nginx /etc/nginx
USER 101

EXPOSE 8080

# nginx-unprivileged already sets ENTRYPOINT (docker-entrypoint.sh, which runs our
# 40-render-runtime-config.sh) + CMD (nginx -g 'daemon off;') — don't override them.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
