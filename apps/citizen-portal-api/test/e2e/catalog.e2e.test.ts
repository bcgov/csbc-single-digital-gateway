import { type INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthUser } from '@repo/nestjs/auth';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';

/**
 * Auth + validation posture for the citizen catalog (feature 60). The test DATABASE_URL is an
 * unreachable port (test/setup.ts), so handler queries can't be exercised here — those are
 * covered by an ephemeral live-DB probe. What we assert without a DB:
 *  - `/v1/me/applications` is protected (401 without a session).
 *  - `/v1/services` is public: a bad query returns 400 (validation), never 401 — proving the
 *    request reached the pipe past the guard.
 */
const seedUser = (): string =>
  JSON.stringify({ id: 'u', roles: ['citizen'], claims: { sub: 'u' } } satisfies AuthUser);

describe('citizen catalog (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Mirror main.ts: feature controllers opt into URI versioning (`/v1/...`).
    app.enableVersioning({ type: VersioningType.URI });
    app.enableShutdownHooks();
    // No express-session in tests (that's wired in main.ts) — seed req.session.authUser from a header.
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

  it('protects GET /v1/me/applications (401 without a session)', async () => {
    expect((await http().get('/v1/me/applications')).status).toBe(401);
  });

  it('lets an authenticated citizen past the guard on GET /v1/me/applications', async () => {
    // Reaches the handler (then errors on the unreachable DB) — the point is it is NOT 401/403.
    const res = await http().get('/v1/me/applications').set('x-test-user', seedUser());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('exposes GET /v1/services publicly — a bad query is 400, never 401', async () => {
    expect((await http().get('/v1/services?limit=abc')).status).toBe(400);
    expect((await http().get('/v1/services?limit=0')).status).toBe(400);
  });

  it('does not require a session for GET /v1/services', async () => {
    const res = await http().get('/v1/services');
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('does not require a session for GET /v1/services/:id/versions/:versionId', async () => {
    const res = await http().get('/v1/services/svc-1/versions/ver-1');
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
