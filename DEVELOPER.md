# Developer Guide

How to get **single-digital-gateway** running locally. This covers prerequisites,
installing dependencies, starting the Docker services, running database migrations,
seeding the database, and launching the apps.

For the repo layout, the full script list, and coding conventions see [README.md](./README.md).

## Prerequisites

| Tool        | Version | Notes                                                                     |
| ----------- | ------- | ------------------------------------------------------------------------- |
| **Node.js** | `>= 24` | The repo pins `24` in `.nvmrc` — run `nvm use` if you use nvm.            |
| **npm**     | `>= 11` | Ships with Node 24; the repo pins `npm@11.6.2` via `packageManager`.      |
| **Docker**  | recent  | Docker Desktop, or Docker Engine + the Compose plugin (`docker compose`). |
| **Git**     | any     | —                                                                         |

This is a **Turborepo monorepo using npm workspaces** — there is a single lockfile and
`node_modules` at the root. Do not run `npm install` inside individual apps/packages.

## 1. Install dependencies

```bash
git clone <repo-url> single-digital-gateway
cd single-digital-gateway
npm install
```

`npm install` also runs `prepare` → `lefthook install`, which registers the git hooks
(Prettier + oxlint pre-commit; typecheck + tests pre-push).

## 2. Configure environment variables

Every `.env` is gitignored; each package/app ships a committed `.env.example` with
**local-dev defaults that work against the Docker stack out of the box** (they are not
secrets). Copy the ones you need:

```bash
# Required for database migrations + seeding
cp packages/database/.env.example packages/database/.env

# Required to run the two BFF APIs
cp apps/platform-api/.env.example        apps/platform-api/.env
cp apps/citizen-portal-api/.env.example  apps/citizen-portal-api/.env

# Optional — the web apps default VITE_BFF_ORIGIN to the local API if unset
cp apps/platform-web/.env.example        apps/platform-web/.env
cp apps/citizen-portal-web/.env.example  apps/citizen-portal-web/.env
```

| File                           | Owns                                    | Needed for                           |
| ------------------------------ | --------------------------------------- | ------------------------------------ |
| `packages/database/.env`       | `DATABASE_URL`                          | `db:migrate`, `db:seed`, `db:studio` |
| `apps/platform-api/.env`       | OIDC / session / DB for the staff BFF   | running `platform-api` (:4001)       |
| `apps/citizen-portal-api/.env` | OIDC / session / DB for the citizen BFF | running `citizen-portal-api` (:4000) |
| `apps/platform-web/.env`       | `VITE_BFF_ORIGIN`                       | optional (defaults to `:4001`)       |
| `apps/citizen-portal-web/.env` | `VITE_BFF_ORIGIN`                       | optional (defaults to `:4000`)       |
| `.env` (root)                  | compose `*_PORT` overrides              | optional (only to change host ports) |

## 3. Start the local infrastructure (Docker)

The root `compose.yml` runs Postgres, Valkey (session store), and Keycloak (OIDC IdP):

```bash
docker compose up -d
```

| Service     | Container      | Host port                | Purpose                                 |
| ----------- | -------------- | ------------------------ | --------------------------------------- |
| Postgres 16 | `sdg-postgres` | `5432` (`POSTGRES_PORT`) | application database (`sdg`)            |
| Valkey 8    | `sdg-valkey`   | `6380` (`VALKEY_PORT`)   | BFF session store (Redis wire protocol) |
| Keycloak 26 | `sdg-keycloak` | `8080` (`KEYCLOAK_PORT`) | OIDC IdP (admin `admin`/`admin`)        |

Keycloak auto-imports the realms in `keycloak/*.json` (`sdg` for staff, `citizens` for
citizens) on start — no manual setup. Wait until the services report healthy before
migrating:

```bash
docker compose ps
```

If a host port is already taken, override it and start again — e.g.
`POSTGRES_PORT=5433 docker compose up -d` — and set the matching port in
`packages/database/.env` (`DATABASE_URL`) and the APIs' `.env`.

## 4. Run database migrations

With Postgres up and `packages/database/.env` in place, apply the Drizzle migrations
(`packages/database/migrations/`):

```bash
npm run db:migrate -w @repo/database
```

You should see `migrations applied successfully!`. This is safe to re-run — already-applied
migrations are skipped.

## 5. Seed the database

Load the baseline records (document types + a published sample service):

```bash
npm run db:seed -w @repo/database
```

The seed is **idempotent** — it uses fixed ids, so re-running inserts nothing new.

## 6. Run the apps

Start every app + package in watch mode:

```bash
npm run dev       # turbo run dev — every app + package in watch mode
```

| App                  | URL                   | Description                 |
| -------------------- | --------------------- | --------------------------- |
| `platform-web`       | http://localhost:3001 | staff Service Console (SPA) |
| `platform-api`       | http://localhost:4001 | staff BFF                   |
| `citizen-portal-web` | http://localhost:3000 | citizen portal (SPA)        |
| `citizen-portal-api` | http://localhost:4000 | citizen BFF                 |

The NestJS BFFs import `@repo/database`/`@repo/nestjs` from their built `dist`, so their
`dev` task builds those packages first (via `apps/*-api/turbo.json`) — the first
`npm run dev` therefore does a one-time package build before the APIs boot. The web apps
compile `@repo/ui`/`@repo/react` straight from source (instant HMR, no build), so they
start immediately.

To run a single workspace: `npm run dev -w platform-web`. Running an **API** alone
(`npm run dev -w platform-api`) still builds its package deps first; to (re)build all
packages manually, run `npm run build`.

## Everyday commands

```bash
npm run check       # format:check + lint + typecheck + test (run before pushing)
npm run test        # vitest run across all workspaces
npm run lint        # oxlint across the tree
npm run typecheck   # tsc --noEmit + turbo run typecheck
npm run format      # prettier --write .

npm run db:studio -w @repo/database     # browse the DB in Drizzle Studio
npm run db:generate -w @repo/database   # generate a new migration from schema changes
```

## Troubleshooting

- **`db:migrate` / `db:seed` can't connect** — confirm `docker compose ps` shows Postgres
  healthy and that `packages/database/.env` exists with a `DATABASE_URL` whose port matches
  the running container.
- **Port already in use** — override the compose host port (`POSTGRES_PORT` / `VALKEY_PORT`
  / `KEYCLOAK_PORT`) and update the affected `.env` files to match.
- **An API fails to resolve `@repo/database` or `@repo/nestjs`** — the `dist` isn't built.
  Run `npm run build` (or ensure `npm run dev`'s watch tasks have completed their first
  build).
- **Reset the database** — `docker compose down -v` removes the Postgres volume; then
  `docker compose up -d` and re-run migrate + seed.
