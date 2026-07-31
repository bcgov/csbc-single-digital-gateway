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
import { DefaultAgreementsModule } from '../../src/modules/default-agreements/default-agreements.module';

// Auth (401) + validation (400) only — the paths before any DB query (test DB unreachable).
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
const BASE = `/v1/workspaces/${UUID}/default-agreements`;

describe('workspace default agreements (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRoot(authOptions),
        DatabaseModule.forRoot({
          client: createDatabase('postgresql://postgres:postgres@localhost:5599/sdg'),
        }),
        DefaultAgreementsModule,
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

  it('401s the default-agreement endpoints without a session', async () => {
    expect((await http().get(BASE)).status).toBe(401);
    expect((await http().post(BASE).send({ agreementDocumentId: UUID })).status).toBe(401);
    expect((await http().delete(`${BASE}/${UUID}`)).status).toBe(401);
  });

  it('400s an add with a missing/invalid agreementDocumentId', async () => {
    const staff = asUser(['staff']);
    expect((await http().post(BASE).set('x-test-user', staff).send({})).status).toBe(400);
    expect(
      (await http().post(BASE).set('x-test-user', staff).send({ agreementDocumentId: 'nope' }))
        .status,
    ).toBe(400);
  });
});
