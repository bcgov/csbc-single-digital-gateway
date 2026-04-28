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
| `npm run db:seed:export` | Export catalogue + org-unit rows from a live DB into `seed/fixtures/*.json` |
| `npm run db:seed` | Import the committed fixtures into a target DB (requires `ALLOW_DB_SEED=true`) |
| `npm run test:unit` | Run vitest unit tests (`scripts/__tests__/**/*.test.ts`) |

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

## Seeding

The seed system populates a fresh database with the curated **service catalogue** and **org units** from an existing environment, so developer machines and dev/test deployments have realistic data without hand-crafting fixtures.

User-owned tables (`service_contributors`, `org_unit_members`) are deliberately excluded — they hold `userId` foreign keys that won't resolve until users are seeded by a separate flow.

### Tables in scope

`org_units`, `org_unit_relations`, `service_types`, `service_type_versions`, `service_type_version_translations`, `services`, `service_versions`, `service_version_translations`.

### Workflow

1. **Export** (point env at the source DB — typically `dev`):

   ```sh
   DB_HOST=… DB_NAME=… npm run db:seed:export
   ```

   Reads each in-scope table sorted by `createdAt ASC` and writes one JSON file per table to `seed/fixtures/`. Re-running with unchanged data produces a byte-identical fixture file.

2. **Commit** the resulting `seed/fixtures/*.json` files to git.

3. **Seed** a target DB (point env at the destination — typically a fresh local DB):

   ```sh
   ALLOW_DB_SEED=true DB_HOST=… DB_NAME=… npm run db:seed
   ```

   Runs everything in a single transaction:

   - `TRUNCATE … RESTART IDENTITY CASCADE` on the eight in-scope tables. **Precondition:** `CASCADE` will also wipe `service_contributors`, `org_unit_members`, and `applications` (FK chain) — only run against a DB you're willing to reset.
   - Inserts in dependency order, deferring `services.publishedServiceVersionId` and `service_types.publishedServiceTypeVersionId` to a second-pass `UPDATE` (these create FK cycles with their version tables).
   - Prints row counts on success; rolls back on any failure.

### Guards

- `db:seed` refuses to run unless `ALLOW_DB_SEED=true`. `NODE_ENV` is **not** consulted because production-style envs (e.g. dev tier) set `NODE_ENV=production`.
- `db:seed:export` is read-only and does not require the guard.

### Verifying locally

After running `db:seed` against a fresh local DB, the row counts printed to stdout should match the lengths of the committed fixture arrays. UUIDs are preserved verbatim from the source DB, so re-running the seed against a freshly-truncated DB yields identical IDs.

## Adding Schema

Define tables in `src/schema/index.ts` using Drizzle's schema declaration API, then run:

```sh
npm run db:generate
npm run db:migrate
```
