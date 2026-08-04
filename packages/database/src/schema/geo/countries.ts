import { bigint, index, integer, jsonb, numeric, text } from 'drizzle-orm/pg-core';

import { coord, geo } from './_geo-schema';
import { regions } from './regions';
import { subregions } from './subregions';

/**
 * Countries (250 rows). Carries every upstream column. Upstream integer id as PK. `region_id` /
 * `subregion_id` are nullable FKs (the denormalized `region`/`subregion` name strings are kept too,
 * verbatim from the source). `timezones`/`translations` are JSONB blobs. Pure reference data —
 * no timestamps/trigger.
 */
export const countries = geo.table(
  'countries',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    iso3: text('iso3'),
    iso2: text('iso2'),
    numericCode: text('numeric_code'),
    phonecode: text('phonecode'),
    capital: text('capital'),
    currency: text('currency'),
    currencyName: text('currency_name'),
    currencySymbol: text('currency_symbol'),
    tld: text('tld'),
    native: text('native'),
    nationality: text('nationality'),
    population: bigint('population', { mode: 'number' }),
    gdp: bigint('gdp', { mode: 'number' }),
    areaSqKm: numeric('area_sq_km'),
    postalCodeFormat: text('postal_code_format'),
    postalCodeRegex: text('postal_code_regex'),
    region: text('region'),
    regionId: integer('region_id').references(() => regions.id),
    subregion: text('subregion'),
    subregionId: integer('subregion_id').references(() => subregions.id),
    timezones: jsonb('timezones'),
    translations: jsonb('translations'),
    latitude: coord('latitude'),
    longitude: coord('longitude'),
    emoji: text('emoji'),
    emojiU: text('emoji_u'),
    wikiDataId: text('wiki_data_id'),
  },
  (table) => [
    index('geo_countries_region_id_idx').on(table.regionId),
    index('geo_countries_subregion_id_idx').on(table.subregionId),
  ],
);

export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;
