import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { cities, countries, regions, states, subregions } from '../src/schema/geo';

// getTableConfig wants the base `PgTable`; concrete drizzle tables trip invariance under
// exactOptionalPropertyTypes. Widen at the call boundary (see schema.test.ts).
const cfg = (table: unknown) => getTableConfig(table as PgTable);
const cols = (table: unknown) => new Map(cfg(table).columns.map((c) => [c.name, c]));

describe('geo schema — namespace + tables', () => {
  it('places every geo table in the "geo" Postgres schema', () => {
    for (const table of [regions, subregions, countries, states, cities]) {
      expect(cfg(table).schema).toBe('geo');
    }
  });

  it('names the five tables as expected', () => {
    expect([regions, subregions, countries, states, cities].map((t) => cfg(t).name)).toEqual([
      'regions',
      'subregions',
      'countries',
      'states',
      'cities',
    ]);
  });
});

describe('geo schema — integer upstream-id primary keys', () => {
  it('uses an integer id PK on every table (no default — importer supplies the upstream id)', () => {
    for (const table of [regions, subregions, countries, states, cities]) {
      const id = cols(table).get('id');
      expect(id?.getSQLType()).toBe('integer');
      expect(id?.primary).toBe(true);
      expect(id?.hasDefault).toBe(false);
    }
  });
});

describe('geo schema — pure reference tables (no timestamps/trigger columns)', () => {
  it('omits created_at/updated_at on every geo table', () => {
    for (const table of [regions, subregions, countries, states, cities]) {
      const byName = cols(table);
      expect(byName.has('created_at')).toBe(false);
      expect(byName.has('updated_at')).toBe(false);
    }
  });
});

describe('geo.countries — carries every upstream column', () => {
  it('includes the full column set (incl. gdp, area_sq_km, postal_code_*, emoji_u)', () => {
    const byName = cols(countries);
    for (const name of [
      'id',
      'name',
      'iso3',
      'iso2',
      'numeric_code',
      'phonecode',
      'capital',
      'currency',
      'currency_name',
      'currency_symbol',
      'tld',
      'native',
      'nationality',
      'population',
      'gdp',
      'area_sq_km',
      'postal_code_format',
      'postal_code_regex',
      'region',
      'region_id',
      'subregion',
      'subregion_id',
      'timezones',
      'translations',
      'latitude',
      'longitude',
      'emoji',
      'emoji_u',
      'wiki_data_id',
    ]) {
      expect(byName.has(name), `countries.${name} must exist`).toBe(true);
    }
  });

  it('stores coordinates as numeric(11, 8) and blobs as jsonb', () => {
    const byName = cols(countries);
    expect(byName.get('latitude')?.getSQLType()).toBe('numeric(11, 8)');
    expect(byName.get('longitude')?.getSQLType()).toBe('numeric(11, 8)');
    expect(byName.get('translations')?.getSQLType()).toBe('jsonb');
    expect(byName.get('timezones')?.getSQLType()).toBe('jsonb');
    expect(byName.get('population')?.getSQLType()).toBe('bigint');
  });

  it('makes region_id/subregion_id nullable FKs', () => {
    const byName = cols(countries);
    expect(byName.get('region_id')?.notNull).toBe(false);
    expect(byName.get('subregion_id')?.notNull).toBe(false);
    expect(cfg(countries).foreignKeys.length).toBe(2);
  });
});

describe('geo.cities — largest table, FK-linked and indexed', () => {
  it('requires state_id + country_id and FKs both', () => {
    const byName = cols(cities);
    expect(byName.get('state_id')?.notNull).toBe(true);
    expect(byName.get('country_id')?.notNull).toBe(true);
    expect(cfg(cities).foreignKeys.length).toBe(2);
  });

  it('indexes country_id and state_id for lookups', () => {
    const indexNames = cfg(cities).indexes.map((i) => i.config.name);
    expect(indexNames).toContain('geo_cities_country_id_idx');
    expect(indexNames).toContain('geo_cities_state_id_idx');
  });
});
