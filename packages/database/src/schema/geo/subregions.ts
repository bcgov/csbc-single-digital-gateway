import { index, integer, jsonb, text } from 'drizzle-orm/pg-core';

import { geo } from './_geo-schema';
import { regions } from './regions';

/**
 * Sub-regions (22 rows) grouped under a {@link regions | region}. Upstream integer id as PK.
 * Pure reference data — no timestamps/trigger.
 */
export const subregions = geo.table(
  'subregions',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    regionId: integer('region_id')
      .notNull()
      .references(() => regions.id),
    wikiDataId: text('wiki_data_id'),
    translations: jsonb('translations'),
  },
  (table) => [index('geo_subregions_region_id_idx').on(table.regionId)],
);

export type Subregion = typeof subregions.$inferSelect;
export type NewSubregion = typeof subregions.$inferInsert;
