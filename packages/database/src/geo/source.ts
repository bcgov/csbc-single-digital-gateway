import type { NewCity, NewCountry, NewRegion, NewState, NewSubregion } from '../schema/geo';

/**
 * Pinned upstream release of the dr5hn `countries-states-cities-database`. Bumping this is a
 * deliberate one-line change, re-run through `npm run db:seed:geo`.
 */
export const GEO_DATA_REF = 'v3.2-export.7';

/** Raw JSON base URL at the pinned ref. No user input feeds this — `GEO_DATA_REF` is a constant. */
export const GEO_BASE_URL = `https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/${GEO_DATA_REF}/json`;

// --- Raw upstream shapes (loose — only the fields we read; everything is coerced below) ---

export interface RawRegion {
  id: number;
  name: string;
  wikiDataId?: string | null;
  translations?: unknown;
}

export interface RawSubregion extends RawRegion {
  region_id: number;
}

export interface RawCountry {
  id: number;
  name: string;
  iso3?: string | null;
  iso2?: string | null;
  numeric_code?: string | null;
  phonecode?: string | null;
  capital?: string | null;
  currency?: string | null;
  currency_name?: string | null;
  currency_symbol?: string | null;
  tld?: string | null;
  native?: string | null;
  nationality?: string | null;
  population?: number | null;
  gdp?: number | null;
  area_sq_km?: number | string | null;
  postal_code_format?: string | null;
  postal_code_regex?: string | null;
  region?: string | null;
  region_id?: number | null;
  subregion?: string | null;
  subregion_id?: number | null;
  timezones?: unknown;
  translations?: unknown;
  latitude?: string | number | null;
  longitude?: string | number | null;
  emoji?: string | null;
  emojiU?: string | null;
  wikiDataId?: string | null;
}

export interface RawState {
  id: number;
  name: string;
  country_id: number;
  country_code?: string | null;
  iso2?: string | null;
  iso3166_2?: string | null;
  fips_code?: string | null;
  type?: string | null;
  parent_id?: number | null;
  native?: string | null;
  timezone?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  wikiDataId?: string | null;
}

export interface RawCity {
  id: number;
  name: string;
  state_id: number;
  state_code?: string | null;
  country_id: number;
  country_code?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  wikiDataId?: string | null;
}

// In the combined `countries+states+cities.json`, nested city/state objects DROP the redundant
// parent ids/codes (they are implied by nesting) — a nested city carries only id/name/lat/lng/
// timezone. `flattenCities` re-injects `state_id`/`country_id` (+ codes) from the parent context.

/** A city as it appears nested under a state in the combined file (parent ids omitted). */
export interface RawNestedCity {
  id: number;
  name: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  wikiDataId?: string | null;
}

/** A state node in the combined file: its own id/iso2 plus nested cities. */
export interface RawNestedState {
  id: number;
  iso2?: string | null;
  cities?: RawNestedCity[];
}

/** A country node in the combined file: its own id/iso2 plus nested states. */
export interface RawCountryTree {
  id: number;
  iso2?: string | null;
  states?: RawNestedState[];
}

// --- Coercion helpers (defensive — an unexpected/absent field never throws the insert) ---

/** Non-empty trimmed string, else null. */
export function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Required text (NOT NULL columns) — never null, empty string if absent. */
export function reqStr(value: unknown): string {
  return str(value) ?? '';
}

/** Required integer id — `Number()` coerced. */
export function reqInt(value: unknown): number {
  return Number(value);
}

/** Nullable FK integer: absent/null/0/non-finite → null (0 is the source's "no relation" sentinel). */
export function fkInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

/** Nullable number for bigint columns (population/gdp). */
export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Nullable numeric column value as a string (coords, area) — drizzle `numeric` takes a string. */
export function numericStr(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? String(value) : null;
}

/** JSONB blob or null. */
export function jsonbOrNull(value: unknown): unknown {
  return value !== null && typeof value === 'object' ? value : null;
}

// --- Normalizers: raw upstream record → drizzle insert row ---

export function normalizeRegion(r: RawRegion): NewRegion {
  return {
    id: reqInt(r.id),
    name: reqStr(r.name),
    wikiDataId: str(r.wikiDataId),
    translations: jsonbOrNull(r.translations),
  };
}

export function normalizeSubregion(s: RawSubregion): NewSubregion {
  return {
    id: reqInt(s.id),
    name: reqStr(s.name),
    regionId: reqInt(s.region_id),
    wikiDataId: str(s.wikiDataId),
    translations: jsonbOrNull(s.translations),
  };
}

export function normalizeCountry(c: RawCountry): NewCountry {
  return {
    id: reqInt(c.id),
    name: reqStr(c.name),
    iso3: str(c.iso3),
    iso2: str(c.iso2),
    numericCode: str(c.numeric_code),
    phonecode: str(c.phonecode),
    capital: str(c.capital),
    currency: str(c.currency),
    currencyName: str(c.currency_name),
    currencySymbol: str(c.currency_symbol),
    tld: str(c.tld),
    native: str(c.native),
    nationality: str(c.nationality),
    population: num(c.population),
    gdp: num(c.gdp),
    areaSqKm: numericStr(c.area_sq_km),
    postalCodeFormat: str(c.postal_code_format),
    postalCodeRegex: str(c.postal_code_regex),
    region: str(c.region),
    regionId: fkInt(c.region_id),
    subregion: str(c.subregion),
    subregionId: fkInt(c.subregion_id),
    timezones: jsonbOrNull(c.timezones),
    translations: jsonbOrNull(c.translations),
    latitude: numericStr(c.latitude),
    longitude: numericStr(c.longitude),
    emoji: str(c.emoji),
    emojiU: str(c.emojiU),
    wikiDataId: str(c.wikiDataId),
  };
}

export function normalizeState(s: RawState): NewState {
  return {
    id: reqInt(s.id),
    name: reqStr(s.name),
    countryId: reqInt(s.country_id),
    countryCode: str(s.country_code),
    iso2: str(s.iso2),
    iso3166_2: str(s.iso3166_2),
    fipsCode: str(s.fips_code),
    type: str(s.type),
    parentId: fkInt(s.parent_id),
    native: str(s.native),
    timezone: str(s.timezone),
    latitude: numericStr(s.latitude),
    longitude: numericStr(s.longitude),
    wikiDataId: str(s.wikiDataId),
  };
}

export function normalizeCity(c: RawCity): NewCity {
  return {
    id: reqInt(c.id),
    name: reqStr(c.name),
    stateId: reqInt(c.state_id),
    stateCode: str(c.state_code),
    countryId: reqInt(c.country_id),
    countryCode: str(c.country_code),
    latitude: numericStr(c.latitude),
    longitude: numericStr(c.longitude),
    wikiDataId: str(c.wikiDataId),
  };
}

/**
 * Flatten cities out of the combined `countries+states+cities.json` tree. There is no standalone
 * `cities.json` at tagged releases, and nested city objects DROP `state_id`/`country_id`/codes —
 * so re-inject them from the enclosing state and country (state/country codes from their `iso2`).
 */
export function flattenCities(tree: RawCountryTree[]): RawCity[] {
  const cities: RawCity[] = [];
  for (const country of tree) {
    for (const state of country.states ?? []) {
      for (const city of state.cities ?? []) {
        cities.push({
          id: city.id,
          name: city.name,
          state_id: state.id,
          state_code: str(state.iso2),
          country_id: country.id,
          country_code: str(country.iso2),
          latitude: city.latitude ?? null,
          longitude: city.longitude ?? null,
          wikiDataId: city.wikiDataId ?? null,
        });
      }
    }
  }
  return cities;
}

/** Fetch and parse a JSON file from the pinned upstream ref. */
export async function fetchGeoJson<T>(fileName: string): Promise<T> {
  const url = `${GEO_BASE_URL}/${fileName}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `geo import — failed to fetch ${fileName}: ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as T;
}
