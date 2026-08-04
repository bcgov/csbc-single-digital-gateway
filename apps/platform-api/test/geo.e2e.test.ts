import { type INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';

/**
 * Auth + validation posture for the public geo endpoints (feature 153). The test DATABASE_URL is an
 * unreachable port (test/setup.ts), so handler queries can't be exercised here — those are covered
 * by an ephemeral live-DB probe. What we assert without a DB:
 *  - `/v1/geo/*` is public (never 401/403 — it reaches the handler, then errors on the DB).
 *  - a non-integer country id is a 400 (validated in the service before any query, never a 500).
 */
describe('geo reference data (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.enableShutdownHooks();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('exposes GET /v1/geo/countries publicly (never 401/403)', async () => {
    const res = await http().get('/v1/geo/countries');
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('returns 400 for a non-integer country id (before any DB call)', async () => {
    expect((await http().get('/v1/geo/countries/abc/states')).status).toBe(400);
    expect((await http().get('/v1/geo/countries/0/states')).status).toBe(400);
    expect((await http().get('/v1/geo/countries/-3/states')).status).toBe(400);
  });

  it('exposes GET /v1/geo/countries/:id/states publicly for a valid id (never 401/403)', async () => {
    const res = await http().get('/v1/geo/countries/1/states');
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  // Address search (feature 154). No BC_GEOCODER_API_KEY in the test env → no region is configured,
  // so these run WITHOUT any DB or upstream call and are fully deterministic.
  it('reports no address-search regions when the geocoder is unconfigured', async () => {
    const res = await http().get('/v1/geo/address-search/regions');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('validates GET /v1/geo/address-search query params (400 on missing/blank)', async () => {
    expect((await http().get('/v1/geo/address-search')).status).toBe(400);
    expect((await http().get('/v1/geo/address-search?country=CA&province=BC')).status).toBe(400);
    expect((await http().get('/v1/geo/address-search?country=C&province=BC&q=x')).status).toBe(400);
  });

  it('returns an empty result for a valid query when unconfigured (200, never 401/403)', async () => {
    const res = await http().get('/v1/geo/address-search?country=CA&province=BC&q=douglas');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});
