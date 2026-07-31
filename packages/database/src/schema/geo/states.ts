import { index, integer, text } from 'drizzle-orm/pg-core';

import { coord, geo } from './_geo-schema';
import { countries } from './countries';

/**
 * States / provinces / regions (~5,300 rows) under a {@link countries | country}. Upstream integer
 * id as PK. `parent_id` is self-referential in the source but sparse — stored as a plain nullable
 * int (no self-FK). Pure reference data — no timestamps/trigger.
 */
export const states = geo.table(
  'states',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    countryId: integer('country_id')
      .notNull()
      .references(() => countries.id),
    countryCode: text('country_code'),
    iso2: text('iso2'),
    iso3166_2: text('iso3166_2'),
    fipsCode: text('fips_code'),
    type: text('type'),
    parentId: integer('parent_id'),
    native: text('native'),
    timezone: text('timezone'),
    latitude: coord('latitude'),
    longitude: coord('longitude'),
    wikiDataId: text('wiki_data_id'),
  },
  (table) => [index('geo_states_country_id_idx').on(table.countryId)],
);

export type State = typeof states.$inferSelect;
export type NewState = typeof states.$inferInsert;
