import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// Committed e2e is auth + validation only (the test DB is an unreachable port by design);
// real read/upsert behavior is verified against live Postgres in integration.
describe('/v1/recipients/:userId/preferences (e2e — auth + validation)', () => {
  let app: INestApplication;
  const USER_ID = '11111111-1111-4111-8111-111111111111';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('401s GET without a token', async () => {
    const res = await request(app.getHttpServer()).get(`/v1/recipients/${USER_ID}/preferences`);
    expect(res.status).toBe(401);
  });

  it('401s PUT without a token', async () => {
    const res = await request(app.getHttpServer())
      .put(`/v1/recipients/${USER_ID}/preferences`)
      .send({});
    expect(res.status).toBe(401);
  });

  it('400s a non-uuid userId (authenticated GET)', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/recipients/not-a-uuid/preferences')
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(400);
  });

  it('400s an invalid body (authenticated PUT)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/v1/recipients/${USER_ID}/preferences`)
      .set('Authorization', 'Bearer test-token')
      .send({ channels: [{ channel: 'sms', enabled: true }] });
    expect(res.status).toBe(400);
  });

  it('400s duplicate channel entries (authenticated PUT)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/v1/recipients/${USER_ID}/preferences`)
      .set('Authorization', 'Bearer test-token')
      .send({
        channels: [
          { channel: 'in_app', enabled: true },
          { channel: 'in_app', enabled: false },
        ],
      });
    expect(res.status).toBe(400);
  });
});
