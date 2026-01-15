# Stage 0: Base Image
FROM node:24-alpine AS base

RUN npm install -g turbo
RUN npx turbo telemetry disable

# Stage 1: Prune application
FROM base AS prune

WORKDIR /app

COPY . .

RUN npx turbo prune web --docker

# Stage 2: Install production dependencies
FROM base AS dependencies

WORKDIR /app

COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/package-lock.json ./package-lock.json

RUN npm ci --only=production

# Stage 3: Build application
FROM base AS build

WORKDIR /app

COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/package-lock.json ./package-lock.json

RUN npm ci
COPY --from=prune /app/out/full/ .

RUN npx turbo build --filter=web

# Stage 4: Production
FROM nginxinc/nginx-unprivileged:alpine-perl AS production

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY /apps/web/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
