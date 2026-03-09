# @repo/db

Shared database package providing the Drizzle ORM client, schema definitions, and migration tooling.

## Setup

Install dependencies from the repo root:

```sh
npm install
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:push` | Push schema changes directly (no migration file) |
| `npm run db:studio` | Open Drizzle Studio GUI |

All `db:*` scripts require database env vars to be set (see below).

## Environment Variables

| Variable | Description |
| --- | --- |
| `DB_NAME` | PostgreSQL database name |
| `DB_HOST` | Database host |
| `DB_PORT` | Database port |
| `DB_USER` | Database user |
| `DB_PASS` | Database password |
| `DB_SSL` | `"true"` or `"false"` |

The package loads `dotenv/config` at runtime to ensure env vars are available when the client initialises. This is a no-op if env vars are already set by other means (Docker, K8s, etc.).

## Usage

```ts
import { db } from '@repo/db';
import type { Schema, Database } from '@repo/db';
```

## Adding Schema

Define tables in `src/schema/index.ts` using Drizzle's schema declaration API, then run:

```sh
npm run db:generate
npm run db:migrate
```
