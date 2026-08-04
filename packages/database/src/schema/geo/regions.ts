import { integer, jsonb, text } from 'drizzle-orm/pg-core';

import { geo } from './_geo-schema';

/**
 * Top-level world regions (6 rows: Africa, Americas, Asia, Europe, Oceania, Polar). The primary
 * key is the upstream integer id so imports upsert on it and inter-geo FKs use upstream ids.
 * Pure reference data — no `created_at`/`updated_at`/trigger (refreshed by re-import).
 */
export const regions = geo.table('regions', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  wikiDataId: text('wiki_data_id'),
  translations: jsonb('translations'),
});

export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;
