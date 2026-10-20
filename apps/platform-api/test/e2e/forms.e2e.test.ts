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
import { FormsModule } from '../../src/modules/forms/forms.module';

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
import { seedUser } from '../utils/test-helpers';
import { UUID } from '../utils/fixtures';

describe('Forms E2E Test Suite', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRoot(authOptions),
        DatabaseModule.forRoot({
          client: createDatabase('postgresql://postgres:postgres@localhost:5599/sdg'),
        }),
        FormsModule,
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

  it('Should return 401 for form endpoints without a session', async () => {
    expect((await http().get(`/v1/forms/${UUID}`)).status).toBe(401);
    expect((await http().post('/v1/forms').send({})).status).toBe(401);
    expect((await http().patch(`/v1/forms/${UUID}/versions/${UUID}`).send({})).status).toBe(401);
  });

  it('Should return 400 for invalid create + patch bodies for a signed-in user', async () => {
    const staff = seedUser(['staff']);
    expect((await http().post('/v1/forms').set('x-test-user', staff).send({})).status).toBe(400);
    expect(
      (
        await http()
          .post('/v1/forms')
          .set('x-test-user', staff)
          .send({ workspaceId: 'nope', typeId: 'nope', title: '', definition: {} })
      ).status,
    ).toBe(400);
    expect(
      (
        await http()
          .patch(`/v1/forms/${UUID}/versions/${UUID}`)
          .set('x-test-user', staff)
          .send({ definition: 'not-an-object' })
      ).status,
    ).toBe(400);
  });
});
