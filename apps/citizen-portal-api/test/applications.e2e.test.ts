import { type INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthUser } from '@repo/nestjs/auth';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

/**
 * Auth + validation posture for the citizen application surface (feature 63). The test DATABASE_URL
 * is unreachable, so handler queries aren't exercised here (covered by a live-DB probe). We assert:
 *  - `/v1/me/applications*` is protected (401 without a session);
 *  - the form-to-fill read is public (not 401);
 *  - request bodies validate (400) once past the guard.
 */
const seedUser = (): string =>
  JSON.stringify({ id: 'u', roles: ['citizen'], claims: { sub: 'u' } } satisfies AuthUser);

// Mutating requests must carry an allowlisted Origin to clear the CSRF guard (which runs before
// AuthGuard); it defaults to the local SPA origin. Without it, mutations are 403'd, not 401'd.
const ORIGIN = 'http://localhost:3000';

describe('citizen applications (e2e)', () => {
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

  it('protects the /v1/me/applications lifecycle (401 without a session)', async () => {
    expect((await http().get('/v1/me/applications')).status).toBe(401);
    expect(
      (await http().post('/v1/me/applications').set('Origin', ORIGIN).send({ formVersionId: 'x' }))
        .status,
    ).toBe(401);
    expect((await http().get('/v1/me/applications/abc')).status).toBe(401);
    expect(
      (await http().patch('/v1/me/applications/abc').set('Origin', ORIGIN).send({ data: {} }))
        .status,
    ).toBe(401);
    expect(
      (await http().post('/v1/me/applications/abc/submit').set('Origin', ORIGIN).send({ data: {} }))
        .status,
    ).toBe(401);
  });

  it('rejects a mutating request with no allowlisted Origin (CSRF, 403)', async () => {
    const res = await http()
      .post('/v1/me/applications')
      .set('x-test-user', seedUser())
      .send({ formVersionId: 'x' });
    expect(res.status).toBe(403);
  });

  it('validates the create body once past the guards (400)', async () => {
    // Missing formVersionId, and a non-uuid value — both fail Zod before any DB access.
    expect(
      (
        await http()
          .post('/v1/me/applications')
          .set('x-test-user', seedUser())
          .set('Origin', ORIGIN)
          .send({})
      ).status,
    ).toBe(400);
    expect(
      (
        await http()
          .post('/v1/me/applications')
          .set('x-test-user', seedUser())
          .set('Origin', ORIGIN)
          .send({ formVersionId: 'not-a-uuid' })
      ).status,
    ).toBe(400);
  });

  it('exposes the form-to-fill read publicly (no session required)', async () => {
    const res = await http().get('/v1/services/svc-1/applications/form-1');
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
