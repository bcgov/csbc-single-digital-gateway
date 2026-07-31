import { describe, expect, it } from 'vitest';

import {
  fkInt,
  flattenCities,
  GEO_BASE_URL,
  GEO_DATA_REF,
  jsonbOrNull,
  normalizeCity,
  normalizeCountry,
  normalizeRegion,
  normalizeState,
  normalizeSubregion,
  num,
  numericStr,
  str,
} from '../src/geo/source';
import type { RawCountryTree } from '../src/geo/source';

describe('geo source — pinned upstream ref', () => {
  it('builds the raw JSON URL from the pinned release tag', () => {
    expect(GEO_DATA_REF).toBe('v3.2-export.7');
    expect(GEO_BASE_URL).toBe(
      `https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/${GEO_DATA_REF}/json`,
    );
  });
});

describe('geo source — coercion helpers', () => {
  it('str() returns a trimmed non-empty string, else null', () => {
    expect(str('  Kabul ')).toBe('Kabul');
    expect(str('')).toBeNull();
    expect(str('   ')).toBeNull();
    expect(str(null)).toBeNull();
    expect(str(42)).toBeNull();
  });

  it('fkInt() maps absent/null/0/non-finite to null (0 = source "no relation" sentinel)', () => {
    expect(fkInt(5)).toBe(5);
    expect(fkInt('5')).toBe(5);
    expect(fkInt(0)).toBeNull();
    expect(fkInt(null)).toBeNull();
    expect(fkInt(undefined)).toBeNull();
    expect(fkInt('nope')).toBeNull();
  });

  it('num() coerces to a finite number or null', () => {
    expect(num(1234)).toBe(1234);
    expect(num('1234')).toBe(1234);
    expect(num('')).toBeNull();
    expect(num(null)).toBeNull();
  });

  it('numericStr() passes through a numeric-valued string, else null', () => {
    expect(numericStr('36.80402540')).toBe('36.80402540');
    expect(numericStr(652230)).toBe('652230');
    expect(numericStr('')).toBeNull();
    expect(numericStr(null)).toBeNull();
  });

  it('jsonbOrNull() keeps objects, drops non-objects', () => {
    expect(jsonbOrNull({ fr: 'Afrique' })).toEqual({ fr: 'Afrique' });
    expect(jsonbOrNull('x')).toBeNull();
    expect(jsonbOrNull(null)).toBeNull();
  });
});

describe('geo source — normalizers', () => {
  it('normalizeRegion maps id/name/wikiDataId/translations', () => {
    expect(
      normalizeRegion({
        id: 1,
        name: 'Africa',
        wikiDataId: 'Q15',
        translations: { fr: 'Afrique' },
      }),
    ).toEqual({
      id: 1,
      name: 'Africa',
      wikiDataId: 'Q15',
      translations: { fr: 'Afrique' },
    });
  });

  it('normalizeSubregion carries region_id', () => {
    const row = normalizeSubregion({
      id: 19,
      name: 'Australia and New Zealand',
      region_id: 5,
      wikiDataId: 'Q45256',
    });
    expect(row.regionId).toBe(5);
    expect(row.name).toBe('Australia and New Zealand');
  });

  it('normalizeCountry maps every column incl. emojiU→emojiU and coord strings', () => {
    const row = normalizeCountry({
      id: 1,
      name: 'Afghanistan',
      iso3: 'AFG',
      iso2: 'AF',
      numeric_code: '004',
      phonecode: '93',
      capital: 'Kabul',
      currency: 'AFN',
      currency_name: 'Afghan afghani',
      currency_symbol: '؋',
      tld: '.af',
      native: 'افغانستان',
      nationality: 'Afghan',
      population: 38041754,
      gdp: 19101000000,
      area_sq_km: 652230,
      postal_code_format: '####',
      postal_code_regex: '^(\\d{4})$',
      region: 'Asia',
      region_id: 3,
      subregion: 'Southern Asia',
      subregion_id: 14,
      timezones: [{ zoneName: 'Asia/Kabul' }],
      translations: { fr: 'Afghanistan' },
      latitude: '33.00000000',
      longitude: '65.00000000',
      emoji: '🇦🇫',
      emojiU: 'U+1F1E6 U+1F1EB',
      wikiDataId: 'Q889',
    });
    expect(row.gdp).toBe(19101000000);
    expect(row.areaSqKm).toBe('652230');
    expect(row.postalCodeFormat).toBe('####');
    expect(row.postalCodeRegex).toBe('^(\\d{4})$');
    expect(row.regionId).toBe(3);
    expect(row.subregionId).toBe(14);
    expect(row.latitude).toBe('33.00000000');
    expect(row.emojiU).toBe('U+1F1E6 U+1F1EB');
    expect(row.timezones).toEqual([{ zoneName: 'Asia/Kabul' }]);
  });

  it('normalizeCountry nulls a 0/empty region_id and blank strings', () => {
    const row = normalizeCountry({
      id: 999,
      name: 'Nowhere',
      region_id: 0,
      subregion_id: null,
      capital: '',
    });
    expect(row.regionId).toBeNull();
    expect(row.subregionId).toBeNull();
    expect(row.capital).toBeNull();
  });

  it('normalizeState maps country_id and nullable parent_id', () => {
    const row = normalizeState({
      id: 3901,
      name: 'Badakhshan',
      country_id: 1,
      country_code: 'AF',
      iso2: 'BDS',
      iso3166_2: 'AF-BDS',
      fips_code: '01',
      type: 'province',
      parent_id: null,
      native: 'بدخشان',
      timezone: 'Asia/Kabul',
      latitude: '36.80402540',
      longitude: '71.36765800',
      wikiDataId: 'Q165376',
    });
    expect(row.countryId).toBe(1);
    expect(row.parentId).toBeNull();
    expect(row.iso3166_2).toBe('AF-BDS');
    expect(row.longitude).toBe('71.36765800');
  });

  it('normalizeCity keeps state_id + country_id linkage', () => {
    const row = normalizeCity({
      id: 52,
      name: 'Ashkāsham',
      state_id: 3901,
      state_code: 'BDS',
      country_id: 1,
      country_code: 'AF',
      latitude: '36.68333000',
      longitude: '71.53333000',
      wikiDataId: 'Q4805192',
    });
    expect(row.stateId).toBe(3901);
    expect(row.countryId).toBe(1);
    expect(row.name).toBe('Ashkāsham');
  });
});

describe('geo source — flattenCities', () => {
  it('walks countries[].states[].cities[] and re-injects parent ids/codes onto each city', () => {
    // Nested cities carry only id/name/lat/lng — state_id/country_id/codes come from the parents.
    const tree: RawCountryTree[] = [
      {
        id: 1,
        iso2: 'AA',
        states: [
          {
            id: 10,
            iso2: 'S10',
            cities: [
              { id: 100, name: 'C100' },
              { id: 101, name: 'C101' },
            ],
          },
          { id: 11, iso2: 'S11', cities: [{ id: 102, name: 'C102' }] },
        ],
      },
      { id: 2, iso2: 'BB', states: [{ id: 12, iso2: 'S12', cities: [{ id: 103, name: 'C103' }] }] },
    ];
    const flat = flattenCities(tree);
    expect(flat.map((c) => c.id)).toEqual([100, 101, 102, 103]);
    expect(flat[0]).toMatchObject({
      id: 100,
      state_id: 10,
      state_code: 'S10',
      country_id: 1,
      country_code: 'AA',
    });
    expect(flat[3]).toMatchObject({
      id: 103,
      state_id: 12,
      state_code: 'S12',
      country_id: 2,
      country_code: 'BB',
    });
  });

  it('tolerates missing states/cities arrays', () => {
    expect(flattenCities([{ id: 1 }, { id: 2, states: [{ id: 10 }] }])).toEqual([]);
  });
});
