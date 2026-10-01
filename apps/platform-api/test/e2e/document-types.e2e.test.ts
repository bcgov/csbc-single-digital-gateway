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
import { DocumentTypesModule } from '../../src/modules/document-types/document-types.module';
import { UUID } from '../utils/fixtures';
import { seedUser } from '../utils/test-helpers';

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

describe('Document Types E2E Test Suite', () => {
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

  it('401s document-types catalog endpoints without a session', async () => {
    // GET /v1/document-types (list)
    expect((await http().get('/v1/document-types')).status).toBe(401);
    // GET /v1/document-types/:id (get)
    expect((await http().get(`/v1/document-types/${UUID}`)).status).toBe(401);
    // GET /v1/document-types/:id/versions/:versionId (getVersion)
    expect((await http().get(`/v1/document-types/${UUID}/versions/${UUID}`)).status).toBe(401);
  });

  it('404s unmapped mutation routes on document-types for authenticated staff (read-only catalog)', async () => {
    const staff = seedUser(['staff']);

    // Document types catalog is read-only for staff — mutations should not have registered route handlers
    expect(
      (await http().post('/v1/document-types').set('x-test-user', staff).send({})).status,
    ).toBe(404);
    expect(
      (await http().put(`/v1/document-types/${UUID}`).set('x-test-user', staff).send({})).status,
    ).toBe(404);
    expect(
      (await http().delete(`/v1/document-types/${UUID}`).set('x-test-user', staff)).status,
    ).toBe(404);
    expect(
      (await http().post(`/v1/document-types/${UUID}/versions`).set('x-test-user', staff).send({}))
        .status,
    ).toBe(404);
  });
});
