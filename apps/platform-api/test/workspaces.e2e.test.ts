import { type INestApplication } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createDatabase } from '@repo/database';
import { AuthModule, type AuthModuleOptions, type AuthUser } from '@repo/nestjs/auth';
import { DatabaseModule } from '@repo/nestjs/database';
import type { NextFunction, Request, Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WorkspacesModule } from '../src/modules/workspaces/workspaces.module';

// Mirrors guard.e2e.test.ts: build a minimal app around the real WorkspacesModule, seed the session
// from an x-test-user header (no real OIDC), and point the DB at an unreachable port. This exercises
// AUTH (401) and VALIDATION (400) — the paths that run before any query. The real CRUD/membership
// behaviour is verified against a live Postgres in integration (Phase 7b), since the test DB is down.
const authOptions = {
  issuer: 'https://idp.example.com',
  clientId: 'c',
  clientSecret: 's',
  redirectUri: 'http://localhost:4001/auth/callback',
  postLoginRedirect: 'http://localhost:3000/app',
  session: { secret: 'a-long-enough-session-secret' },
  publicPaths: [],
  config: {} as unknown as NonNullable<AuthModuleOptions['config']>,
} satisfies AuthModuleOptions;

const seedUser = JSON.stringify({
  id: 'u1',
  roles: ['staff'],
  claims: { sub: 'u1' },
} satisfies AuthUser);

describe('workspaces (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRoot(authOptions),
        DatabaseModule.forRoot({
          client: createDatabase('postgresql://postgres:postgres@localhost:5599/sdg'),
        }),
        WorkspacesModule,
      ],
      // AppModule registers this globally; the minimal test module wires it explicitly so the
      // createZodDto body/query DTOs are validated (400 on bad input) here too.
      providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: (await import('@nestjs/common')).VersioningType.URI });
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

  it('401s every endpoint without a session', async () => {
    expect((await http().get('/v1/workspaces')).status).toBe(401);
    expect((await http().post('/v1/workspaces').send({ name: 'X' })).status).toBe(401);
    expect((await http().get('/v1/workspaces/by-slug/abc')).status).toBe(401);
    expect((await http().get('/v1/workspaces/abc')).status).toBe(401);
    expect((await http().patch('/v1/workspaces/abc').send({ name: 'X' })).status).toBe(401);
    expect((await http().delete('/v1/workspaces/abc')).status).toBe(401);
    expect(
      (await http().post('/v1/workspaces/abc/transfer-ownership').send({ userId: 'u2' })).status,
    ).toBe(401);
    expect((await http().get('/v1/workspaces/abc/addable-staff')).status).toBe(401);
    expect(
      (await http().post('/v1/workspaces/abc/members').send({ userId: 'u2', role: 'member' }))
        .status,
    ).toBe(401);
  });

  it('400s an invalid create body for an authenticated caller', async () => {
    expect((await http().post('/v1/workspaces').set('x-test-user', seedUser).send({})).status).toBe(
      400,
    );
    expect(
      (await http().post('/v1/workspaces').set('x-test-user', seedUser).send({ name: '' })).status,
    ).toBe(400);
  });

  it('400s an invalid add-member body for an authenticated caller', async () => {
    const post = (body: object) =>
      http().post('/v1/workspaces/abc/members').set('x-test-user', seedUser).send(body);
    expect((await post({})).status).toBe(400); // missing userId + role
    expect((await post({ userId: 'not-a-uuid', role: 'member' })).status).toBe(400);
    expect(
      (await post({ userId: '11111111-1111-4111-8111-111111111111', role: 'owner' })).status,
    ).toBe(400); // bad role
  });

  it('400s an invalid transfer-ownership body for an authenticated caller', async () => {
    expect(
      (
        await http()
          .post('/v1/workspaces/abc/transfer-ownership')
          .set('x-test-user', seedUser)
          .send({})
      ).status,
    ).toBe(400);
    expect(
      (
        await http()
          .post('/v1/workspaces/abc/transfer-ownership')
          .set('x-test-user', seedUser)
          .send({ userId: 'not-a-uuid' })
      ).status,
    ).toBe(400);
  });

  it('400s an invalid list query for an authenticated caller', async () => {
    expect(
      (await http().get('/v1/workspaces?sort=bogus').set('x-test-user', seedUser)).status,
    ).toBe(400);
    expect((await http().get('/v1/workspaces?limit=0').set('x-test-user', seedUser)).status).toBe(
      400,
    );
  });

  it('401s the paginated members browse without a session', async () => {
    expect((await http().get('/v1/workspaces/abc/members/page')).status).toBe(401);
  });

  it('400s an invalid members browse query for an authenticated caller', async () => {
    expect(
      (await http().get('/v1/workspaces/abc/members/page?limit=0').set('x-test-user', seedUser))
        .status,
    ).toBe(400);
    expect(
      (await http().get('/v1/workspaces/abc/members/page?sort=bogus').set('x-test-user', seedUser))
        .status,
    ).toBe(400);
  });
});
