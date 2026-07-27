import { type INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthUser } from '@repo/nestjs/auth';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

/**
 * Auth + validation posture for the citizen consent surface (feature 89). The test DATABASE_URL is
 * unreachable, so handler queries aren't exercised (covered by a live-DB probe). We assert the
 * consent endpoints are protected (401) and the record body validates (400) past the guard.
 */
const seedUser = (): string =>
  JSON.stringify({ id: 'u', roles: ['citizen'], claims: { sub: 'u' } } satisfies AuthUser);
const ORIGIN = 'http://localhost:3000';
const UUID = '11111111-1111-4111-8111-111111111111';

describe('citizen consent (e2e)', () => {
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

  it('protects the consent endpoints (401 without a session)', async () => {
    expect((await http().get(`/v1/me/services/${UUID}/agreements`)).status).toBe(401);
    expect(
      (
        await http()
          .post('/v1/me/agreement-consents')
          .set('Origin', ORIGIN)
          .send({ agreementVersionId: UUID, decision: 'approve' })
      ).status,
    ).toBe(401);
  });

  it('400s an invalid record body for a signed-in user', async () => {
    const user = seedUser();
    expect(
      (
        await http()
          .post('/v1/me/agreement-consents')
          .set('Origin', ORIGIN)
          .set('x-test-user', user)
          .send({})
      ).status,
    ).toBe(400);
    expect(
      (
        await http()
          .post('/v1/me/agreement-consents')
          .set('Origin', ORIGIN)
          .set('x-test-user', user)
          .send({ agreementVersionId: UUID, decision: 'maybe' })
      ).status,
    ).toBe(400);
  });
});
