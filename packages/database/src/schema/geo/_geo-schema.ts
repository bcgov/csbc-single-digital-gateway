import { numeric, pgSchema } from 'drizzle-orm/pg-core';

/**
 * The `geo` Postgres schema — a dedicated namespace for the third-party geographic reference
 * dataset (dr5hn `countries-states-cities-database`, feature 152). Kept apart from the app's
 * domain tables in `public` because it is large, import-driven, and refreshed wholesale; FKs
 * from `public.*` → `geo.*` still work (same database). drizzle-kit emits `CREATE SCHEMA "geo"`.
 */
export const geo = pgSchema('geo');

/**
 * Latitude/longitude helper. The upstream data ships coordinates as strings (e.g. `"36.80402540"`);
 * `numeric(11, 8)` preserves them exactly (max |lat| 90, |lng| 180, 8 fractional digits).
 */
export const coord = (name: string) => numeric(name, { precision: 11, scale: 8 });
