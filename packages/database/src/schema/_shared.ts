import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Case-insensitive text, backed by the Postgres `citext` extension (created in the
 * bootstrap migration). Used for `users.email` so lookups are case-insensitive without
 * lower()-ing every query.
 */
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

/** `uuid` primary key defaulting to `gen_random_uuid()`. */
export const uuidPk = () => uuid('id').primaryKey().defaultRandom();

/** `timestamptz` column helper (all timestamps in this schema are timezone-aware). */
export const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

/** `created_at timestamptz NOT NULL DEFAULT now()`. */
export const createdAt = () => timestamptz('created_at').notNull().defaultNow();

/**
 * `updated_at timestamptz NOT NULL DEFAULT now()`. The value is maintained on UPDATE by
 * the `set_updated_at()` trigger (attached per-table in the triggers migration), not by
 * the application.
 */
export const updatedAt = () => timestamptz('updated_at').notNull().defaultNow();
