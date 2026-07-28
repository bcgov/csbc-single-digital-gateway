import { type INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthUser } from '@repo/nestjs/auth';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

/**
 * Auth + validation posture for the citizen service-agreement history (feature 139). The test
 * DATABASE_URL is unreachable, so handler queries aren't exercised here (covered by a live-DB probe).
 * We assert: `/v1/me/service-agreements*` is protected (401 without a session), and a malformed
 * `:id` is a clean 400 (validated before any DB access).
 */
const seedUser = (): string =>
  JSON.stringify({ id: 'u', roles: ['citizen'], claims: { sub: 'u' } } satisfies AuthUser);

describe('citizen service-agreement history (e2e)', () => {
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

  it('protects the history endpoints (401 without a session)', async () => {
    expect((await http().get('/v1/me/service-agreements')).status).toBe(401);
    expect((await http().get('/v1/me/service-agreements/abc')).status).toBe(401);
  });

  it('rejects a malformed :id with 400 once past the guard (before any DB access)', async () => {
    const res = await http()
      .get('/v1/me/service-agreements/not-a-uuid')
      .set('x-test-user', seedUser());
    expect(res.status).toBe(400);
  });
});
