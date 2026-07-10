import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// supertest buffers to completion, which an endless SSE stream never reaches — use raw http
// against the (listening) test server instead.
const addressOf = (server: http.Server) => {
  if (!server.listening) {
    server.listen(0);
  }
  const addr = server.address() as AddressInfo;
  return { host: '127.0.0.1', port: addr.port };
};

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

  it('401s the stream without a token and 200s text/event-stream with one', async () => {
    const server = app.getHttpServer();
    expect(
      (await request(server).get(`/v1/recipients/${USER_ID}/notifications/stream`)).status,
    ).toBe(401);
    // The stream never ends — issue a raw request and inspect only the head.
    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          ...addressOf(server),
          path: `/v1/recipients/${USER_ID}/notifications/stream`,
          headers: { authorization: 'Bearer test-token' },
        },
        (res) => {
          try {
            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toContain('text/event-stream');
            expect(res.headers['x-accel-buffering']).toBe('no');
            res.once('data', (chunk: Buffer) => {
              try {
                expect(chunk.toString()).toContain(': connected');
                req.destroy();
                resolve();
              } catch (e) {
                reject(e as Error);
              }
            });
          } catch (e) {
            req.destroy();
            reject(e as Error);
          }
        },
      );
      req.on('error', () => resolve()); // socket teardown after destroy is expected
      req.end();
    });
  });
});
