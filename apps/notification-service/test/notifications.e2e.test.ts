import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// Committed e2e is auth + validation only (the test DB is an unreachable port by design);
// real ingestion/fan-out behavior is verified against live Postgres in integration.
describe('POST /v1/notifications (e2e — auth + validation)', () => {
  let app: INestApplication;

  const VALID_BODY = {
    idempotencyKey: 'e2e-key-1',
    userId: '11111111-1111-4111-8111-111111111111',
    type: 'e2e.test',
    title: 'Hello',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('401s without a token', async () => {
    const res = await request(app.getHttpServer()).post('/v1/notifications').send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it('401s with an invalid token', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/notifications')
      .set('Authorization', 'Bearer wrong')
      .send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it('400s an empty body (authenticated)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/notifications')
      .set('Authorization', 'Bearer test-token')
      .send({});
    expect(res.status).toBe(400);
  });

  it('400s a non-uuid userId (authenticated)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/notifications')
      .set('Authorization', 'Bearer test-token')
      .send({ ...VALID_BODY, userId: 'nope' });
    expect(res.status).toBe(400);
  });

  it('400s an invalid seed email (authenticated)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/notifications')
      .set('Authorization', 'Bearer test-token')
      .send({ ...VALID_BODY, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});
