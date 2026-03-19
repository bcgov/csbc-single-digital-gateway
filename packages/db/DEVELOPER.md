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
| `npm run db:generate-docs` | Regenerate [`SCHEMA.md`](./SCHEMA.md) from schema source files |

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

## Schema Documentation

[`SCHEMA.md`](./SCHEMA.md) is auto-generated from the Drizzle schema source files. Regenerate it after schema changes:

```sh
npm run generate:docs
```

The generator extracts standard JSDoc comments (`/** ... */`) from enums, tables, and columns and includes them in the output. For example:

```ts
/** Core user accounts */
export const users = pgTable("users", {
  /** Auto-generated unique identifier */
  id: uuid().primaryKey().defaultRandom(),
  /** Display name shown in the UI */
  name: text(),
});
```

## Adding Schema

Define tables in `src/schema/index.ts` using Drizzle's schema declaration API, then run:

```sh
npm run db:generate
npm run db:migrate
```
