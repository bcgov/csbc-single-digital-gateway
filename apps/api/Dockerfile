# Stage 0: Base Image
FROM node:24-alpine AS base

RUN npm install -g turbo
RUN npx turbo telemetry disable

# Stage 1: Prune project
FROM base AS pruner

WORKDIR /app

COPY . .

RUN npx turbo prune api --docker

# Stage 2: Install production dependencies
FROM base AS dependencies

WORKDIR /app

COPY --from=pruner /app/out/json .

RUN npm ci --only=production

# Stage 3: Build
FROM base AS builder

WORKDIR /app

COPY --from=pruner /app/out/json .

RUN npm ci

COPY --from=pruner /app/out/full .

RUN npx turbo build --filter=api

# Stage 4: Production
FROM node:24-alpine AS production

WORKDIR /app

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules/
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules/

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app

USER nodejs

WORKDIR /app/apps/api

ENV NODE_ENV=production

CMD ["node", "dist/src/main.js"]
