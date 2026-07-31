import { resolve } from 'node:path';
import { config } from 'dotenv';
import { getTableColumns, sql } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';

import { createDatabase } from '../client';
import type { Database } from '../client';
import { resolvePgSsl } from '../ssl';
import { cities, countries, regions, states, subregions } from '../schema/geo';
import {
  fetchGeoJson,
  flattenCities,
  normalizeCity,
  normalizeCountry,
  normalizeRegion,
  normalizeState,
  normalizeSubregion,
  readGeoJson,
} from './source';
import type { RawCountry, RawCountryTree, RawRegion, RawState, RawSubregion } from './source';

// Load this package's own .env (see .env.example) so `npm run db:seed:geo` picks up DATABASE_URL
// regardless of the cwd it is invoked from. This file runs from TWO depths — `src/geo/` under tsx
// (dev) and flat `dist-scripts/` when esbuild-compiled for the migrate job image — so try both
// candidate paths (dotenv ignores a missing file and never overrides an already-set env var; in
// the deploy Job DATABASE_URL comes from the secret, so both no-op harmlessly).
config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true });
config({ path: resolve(import.meta.dirname, '../.env'), quiet: true });

// Rows per INSERT. Sequential within a level — one tx-less pool connection, so batches cannot
// be parallelised. 1,000 keeps the parameter count well under Postgres' 65,535 bind limit.
const BATCH_SIZE = 1000;

function chunk<T>(rows: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    batches.push(rows.slice(i, i + size));
  }
  return batches;
}

/** `SET` clause updating every column except `id` from the conflicting row (upsert refresh). */
function conflictUpdateExceptId(table: PgTable): Record<string, ReturnType<typeof sql>> {
  const columns = getTableColumns(table);
  const entries = Object.entries(columns)
    .filter(([, column]) => column.name !== 'id')
    .map(([key, column]) => [key, sql`excluded.${sql.identifier(column.name)}`] as const);
  return Object.fromEntries(entries);
}

/** Upsert all rows for one table in sequential batches, keyed on the integer `id` PK. */
async function upsertAll<TTable extends PgTable>(
  db: Database,
  table: TTable,
  target: AnyPgColumn,
  rows: TTable['$inferInsert'][],
): Promise<void> {
  if (rows.length === 0) return;
  const set = conflictUpdateExceptId(table);
  for (const batch of chunk(rows, BATCH_SIZE)) {
    // eslint-disable-next-line no-await-in-loop -- sequential batches over one pool connection
    await db.insert(table).values(batch).onConflictDoUpdate({ target, set });
  }
}

async function importGeo(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.trim() === '') {
    throw new Error('db:seed:geo — DATABASE_URL is not set (copy .env.example to .env)');
  }

  const db = createDatabase(url, {
    ssl: resolvePgSsl({ mode: process.env.PGSSLMODE, ca: process.env.DATABASE_CA_CERT }),
  });

  // Source selection: read vendored files baked into the image (GEO_DATA_DIR, set in the
  // db-migrate image so the deploy Job needs NO egress) — else fetch from the pinned upstream ref
  // (local dev). Same file names either way (see GEO_DATA_FILES).
  const dataDir = process.env.GEO_DATA_DIR?.trim();
  const load = <T>(fileName: string): Promise<T> =>
    dataDir ? readGeoJson<T>(dataDir, fileName) : fetchGeoJson<T>(fileName);

  try {
    console.info(
      dataDir
        ? `[geo] reading vendored JSON from ${dataDir}`
        : '[geo] fetching upstream JSON (pinned release)…',
    );
    // Read in FK order. Cities have no standalone file — extracted from the combined tree.
    const rawRegions = await load<RawRegion[]>('regions.json');
    const regionRows = rawRegions.map(normalizeRegion);
    await upsertAll(db, regions, regions.id, regionRows);
    console.info(`[geo] regions: ${regionRows.length}`);

    const rawSubregions = await load<RawSubregion[]>('subregions.json');
    const subregionRows = rawSubregions.map(normalizeSubregion);
    await upsertAll(db, subregions, subregions.id, subregionRows);
    console.info(`[geo] subregions: ${subregionRows.length}`);

    const rawCountries = await load<RawCountry[]>('countries.json');
    const countryRows = rawCountries.map(normalizeCountry);
    await upsertAll(db, countries, countries.id, countryRows);
    console.info(`[geo] countries: ${countryRows.length}`);

    const rawStates = await load<RawState[]>('states.json');
    const stateRows = rawStates.map(normalizeState);
    await upsertAll(db, states, states.id, stateRows);
    console.info(`[geo] states: ${stateRows.length}`);

    console.info('[geo] loading cities (combined countries+states+cities.json, ~46 MB)…');
    const tree = await load<RawCountryTree[]>('countries+states+cities.json');
    const cityRows = flattenCities(tree).map(normalizeCity);
    await upsertAll(db, cities, cities.id, cityRows);
    console.info(`[geo] cities: ${cityRows.length}`);

    console.info('[geo] import complete.');
  } finally {
    await db.$client.end();
  }
}

importGeo().catch((error: unknown) => {
  console.error('[geo] import failed:', error);
  process.exitCode = 1;
});
