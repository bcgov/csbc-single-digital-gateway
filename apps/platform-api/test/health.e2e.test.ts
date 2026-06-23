import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('platform-api health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live → 200 ok (liveness never pings the DB)', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health/ready → 503 when the database is unreachable', async () => {
    // test/setup.ts points DATABASE_URL at an unreachable port, so the DB readiness
    // indicator deterministically reports down. The 200-when-up path is covered against a
    // real Postgres in the feature's integration verification.
    const res = await request(app.getHttpServer()).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.error.database.status).toBe('down');
  });

  it('GET /v1/health/live → 404 (health is root-only, not versioned)', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health/live');
    expect(res.status).toBe(404);
  });
});
