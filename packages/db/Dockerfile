# Stage 0: Base Image
FROM node:24-alpine AS base

RUN npm install -g turbo
RUN npx turbo telemetry disable

# Stage 1: Prune project
FROM base AS pruner

WORKDIR /app

COPY . .

RUN npx turbo prune @repo/db --docker

# Stage 2: Install all dependencies (including devDependencies for drizzle-kit)
FROM base AS dependencies

WORKDIR /app

COPY --from=pruner /app/out/json .

# Install all dependencies (including dev) since drizzle-kit is a devDependency
RUN npm ci

# Stage 3: Production migrations image
FROM node:24-alpine AS migrations

# Install postgresql-client for pg_isready
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy all node_modules (includes drizzle-kit)
COPY --from=dependencies /app/node_modules ./node_modules/

# Copy drizzle configuration and migrations
COPY --from=pruner /app/out/full/packages/db/drizzle ./packages/db/drizzle

# Copy source (config schema needed by drizzle.config.ts at runtime)
COPY --from=pruner /app/out/full/packages/db/src ./packages/db/src

# Copy package.json for npm scripts
COPY --from=pruner /app/out/full/packages/db/package.json ./packages/db/package.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app

USER nodejs

WORKDIR /app/packages/db

ENV NODE_ENV=production

# Run database migrations
CMD ["npx", "tsx", "./drizzle/migrate.ts"]
