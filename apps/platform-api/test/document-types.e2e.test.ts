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
import { DocumentTypesModule } from '../src/modules/document-types/document-types.module';

// Covers auth (401) + role (403) + validation (400) — the paths before any query (the test DB is
// unreachable). Real lifecycle behaviour is verified against live Postgres in integration.
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

describe('document-types (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRoot(authOptions),
        DatabaseModule.forRoot({
          client: createDatabase('postgresql://postgres:postgres@localhost:5599/sdg'),
        }),
        DocumentTypesModule,
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

  it('401s admin + staff endpoints without a session', async () => {
    expect((await http().get('/v1/admin/document-types')).status).toBe(401);
    expect((await http().post('/v1/admin/document-types').send({})).status).toBe(401);
    expect((await http().get('/v1/document-types')).status).toBe(401);
  });

  it('403s admin endpoints for a non-admin (staff) session', async () => {
    expect(
      (
        await http()
          .get('/v1/admin/document-types')
          .set('x-test-user', asUser(['staff']))
      ).status,
    ).toBe(403);
    expect(
      (
        await http()
          .post('/v1/admin/document-types')
          .set('x-test-user', asUser(['staff']))
          .send({})
      ).status,
    ).toBe(403);
  });

  it('400s an invalid create body for an admin', async () => {
    const admin = asUser(['admin']);
    expect(
      (await http().post('/v1/admin/document-types').set('x-test-user', admin).send({})).status,
    ).toBe(400);
    expect(
      (
        await http()
          .post('/v1/admin/document-types')
          .set('x-test-user', admin)
          .send({ name: 'X', kind: 'unknown-kind', definition: {} })
      ).status,
    ).toBe(400);
  });
});
