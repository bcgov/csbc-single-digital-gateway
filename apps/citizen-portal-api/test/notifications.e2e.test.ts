import { type INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthUser } from '@repo/nestjs/auth';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

/**
 * Auth + validation posture for the citizen notifications proxy (feature 113). The upstream
 * notification-service is NOT running in the suite, so only pre-proxy behavior (401 guard,
 * 400 boundary validation) is asserted; live proxy behavior is verified against the running
 * stack in integration.
 */
const seedUser = (): string =>
  JSON.stringify({ id: 'u', roles: ['citizen'], claims: { sub: 'u' } } satisfies AuthUser);
const ORIGIN = 'http://localhost:3000';
const UUID = '11111111-1111-4111-8111-111111111111';

describe('citizen notifications proxy (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.enableShutdownHooks();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const header = req.headers['x-test-user'];
      if (typeof header === 'string') {
        (req as unknown as { session: { authUser?: AuthUser } }).session = {
          authUser: JSON.parse(header) as AuthUser,
        };
      }
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('protects every notifications route (401 without a session)', async () => {
    expect((await http().get('/v1/me/notifications')).status).toBe(401);
    expect((await http().get('/v1/me/notifications/unread-count')).status).toBe(401);
    expect(
      (await http().post(`/v1/me/notifications/${UUID}/read`).set('Origin', ORIGIN)).status,
    ).toBe(401);
    expect((await http().post('/v1/me/notifications/read-all').set('Origin', ORIGIN)).status).toBe(
      401,
    );
    expect((await http().get('/v1/me/notification-preferences')).status).toBe(401);
    expect(
      (await http().put('/v1/me/notification-preferences').set('Origin', ORIGIN).send({})).status,
    ).toBe(401);
  });

  it('400s an invalid preferences body for a signed-in user (boundary validation, pre-proxy)', async () => {
    const res = await http()
      .put('/v1/me/notification-preferences')
      .set('Origin', ORIGIN)
      .set('x-test-user', seedUser())
      .send({ channels: [{ channel: 'sms', enabled: true }] });
    expect(res.status).toBe(400);
  });

  it('400s an out-of-range feed limit for a signed-in user (pre-proxy)', async () => {
    const res = await http().get('/v1/me/notifications?limit=101').set('x-test-user', seedUser());
    expect(res.status).toBe(400);
  });
});
