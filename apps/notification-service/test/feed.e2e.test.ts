import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// Committed e2e is auth + validation only (the test DB is an unreachable port by design);
// feed content, unread math and mark-read behavior are verified against live Postgres.
describe('/v1/recipients/:userId/notifications (e2e — auth + validation)', () => {
  let app: INestApplication;
  const USER_ID = '11111111-1111-4111-8111-111111111111';
  const DELIVERY_ID = '22222222-2222-4222-8222-222222222222';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('401s every feed route without a token', async () => {
    const server = app.getHttpServer();
    expect((await request(server).get(`/v1/recipients/${USER_ID}/notifications`)).status).toBe(401);
    expect(
      (await request(server).get(`/v1/recipients/${USER_ID}/notifications/unread-count`)).status,
    ).toBe(401);
    expect(
      (await request(server).post(`/v1/recipients/${USER_ID}/notifications/read-all`)).status,
    ).toBe(401);
    expect(
      (await request(server).post(`/v1/recipients/${USER_ID}/notifications/${DELIVERY_ID}/read`))
        .status,
    ).toBe(401);
  });

  it('400s a non-uuid userId (authenticated)', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/recipients/nope/notifications')
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(400);
  });

  it('400s a non-uuid deliveryId (authenticated)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/recipients/${USER_ID}/notifications/nope/read`)
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(400);
  });

  it('400s an out-of-range limit (authenticated)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/recipients/${USER_ID}/notifications?limit=101`)
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(400);
  });
});
