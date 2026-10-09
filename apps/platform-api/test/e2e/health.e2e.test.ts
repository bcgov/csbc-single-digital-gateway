import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';

describe('Health Check E2E Test Suite', () => {
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

  it('Should return 200 OK for GET /health/live (liveness never pings the DB)', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('Should return 503 for GET /health/ready when the database is unreachable', async () => {
    // test/setup.ts points DATABASE_URL at an unreachable port, so the DB readiness
    // indicator deterministically reports down. The 200-when-up path is covered against a
    // real Postgres in the feature's integration verification.
    const res = await request(app.getHttpServer()).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.error.database.status).toBe('down');
  });

  it('Should return 404 for GET /v1/health/live (health is root-only, not versioned)', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health/live');
    expect(res.status).toBe(404);
  });
});
