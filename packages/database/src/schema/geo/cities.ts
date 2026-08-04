import { index, integer, text } from 'drizzle-orm/pg-core';

import { coord, geo } from './_geo-schema';
import { countries } from './countries';
import { states } from './states';

/**
 * Cities / towns / districts (~153,000 rows) under a {@link states | state} and
 * {@link countries | country}. Upstream integer id as PK. The largest table — indexed by
 * `country_id` and `state_id` for lookups. Pure reference data — no timestamps/trigger.
 */
export const cities = geo.table(
  'cities',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    stateId: integer('state_id')
      .notNull()
      .references(() => states.id),
    stateCode: text('state_code'),
    countryId: integer('country_id')
      .notNull()
      .references(() => countries.id),
    countryCode: text('country_code'),
    latitude: coord('latitude'),
    longitude: coord('longitude'),
    wikiDataId: text('wiki_data_id'),
  },
  (table) => [
    index('geo_cities_country_id_idx').on(table.countryId),
    index('geo_cities_state_id_idx').on(table.stateId),
  ],
);

export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;
