import { type INestApplication, VersioningType } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createDatabase } from '@repo/database';
import { AuthModule, type AuthModuleOptions, type AuthUser } from '@repo/nestjs/auth';
import { DatabaseModule } from '@repo/nestjs/database';
import type { NextFunction, Request, Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ServiceAgreementsModule } from '../src/modules/service-agreements/service-agreements.module';

// Covers auth (401) + validation (400) + role authz (403) — all paths BEFORE any DB query (the
// test DB is unreachable). Real CRUD/publish behaviour is verified against live Postgres.
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

const asUser = (roles: string[]): string =>
  JSON.stringify({ id: 'u1', roles, claims: { sub: 'u1' } } satisfies AuthUser);

const UUID = '11111111-1111-4111-8111-111111111111';

describe('service-agreements (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRoot(authOptions),
        DatabaseModule.forRoot({
          client: createDatabase('postgresql://postgres:postgres@localhost:5599/sdg'),
        }),
        ServiceAgreementsModule,
      ],
      providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
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

  it('401s agreement endpoints without a session', async () => {
    expect((await http().get('/v1/service-agreements')).status).toBe(401);
    expect((await http().post('/v1/service-agreements').send({ data: {} })).status).toBe(401);
  });

  it('400s an invalid create body for a signed-in user', async () => {
    const staff = asUser(['staff']);
    // data is required.
    expect(
      (await http().post('/v1/service-agreements').set('x-test-user', staff).send({})).status,
    ).toBe(400);
    // workspaceId must be a uuid when present.
    expect(
      (
        await http()
          .post('/v1/service-agreements')
          .set('x-test-user', staff)
          .send({ workspaceId: 'not-a-uuid', data: {} })
      ).status,
    ).toBe(400);
  });

  it('403s a non-admin creating a GLOBAL agreement (no workspaceId)', async () => {
    // A valid body with no workspaceId means "global" — admin-only, enforced before any DB query.
    expect(
      (
        await http()
          .post('/v1/service-agreements')
          .set('x-test-user', asUser(['staff']))
          .send({ data: { title: 'ToS' } })
      ).status,
    ).toBe(403);
  });

  it('403s a non-admin listing GLOBAL agreements (no workspaceId)', async () => {
    expect(
      (
        await http()
          .get('/v1/service-agreements')
          .set('x-test-user', asUser(['staff']))
      ).status,
    ).toBe(403);
  });

  it('401s the paginated browse without a session', async () => {
    expect((await http().get('/v1/service-agreements/page')).status).toBe(401);
  });

  it('403s a non-admin browsing GLOBAL agreements (no workspaceId)', async () => {
    expect(
      (
        await http()
          .get('/v1/service-agreements/page')
          .set('x-test-user', asUser(['staff']))
      ).status,
    ).toBe(403);
  });

  it('400s the paginated browse with out-of-range paging or an unknown sort', async () => {
    expect(
      (
        await http()
          .get(`/v1/service-agreements/page?workspaceId=${UUID}&limit=0`)
          .set('x-test-user', asUser(['staff']))
      ).status,
    ).toBe(400);
    expect(
      (
        await http()
          .get(`/v1/service-agreements/page?workspaceId=${UUID}&sort=bogus`)
          .set('x-test-user', asUser(['staff']))
      ).status,
    ).toBe(400);
  });
});
