# syntax=docker/dockerfile:1
#
# Multi-stage production image for citizen-portal-web (Vite SPA, served by nginx on :8080).
# Build from the MONOREPO ROOT:
#   docker build -f apps/citizen-portal-web/Dockerfile -t citizen-portal-web:local .
# Run — BFF_ORIGIN + API_UPSTREAM are REQUIRED at start. This image both serves the SPA and
# reverse-proxies /api/* to the citizen-portal-api BFF, so BFF_ORIGIN is the SAME-ORIGIN path the
# SPA calls (/api) and API_UPSTREAM is the BFF host:port nginx proxies to:
#   docker run -p 8080:8080 -e BFF_ORIGIN=/api -e API_UPSTREAM=citizen-portal-api:4000 citizen-portal-web:local
#
# See .mdd/docs/73-web-app-dockerfiles.md + 78-web-api-same-origin-proxy.md for the rationale.

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

# nginx config is a TEMPLATE: the image's 20-envsubst-on-templates.sh renders
# /etc/nginx/templates/*.template → /etc/nginx/conf.d/ at start, substituting ${API_UPSTREAM}
# (the in-cluster citizen-portal-api Service). NGINX_ENVSUBST_FILTER scopes envsubst to that one var
# so nginx runtime variables ($uri, $host, …) survive. API_UPSTREAM is REQUIRED (see entrypoint).
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM
COPY apps/citizen-portal-web/docker/nginx.conf.template /etc/nginx/templates/default.conf.template
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
