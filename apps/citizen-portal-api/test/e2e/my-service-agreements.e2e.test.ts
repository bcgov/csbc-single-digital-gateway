import { type INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthUser } from '@repo/nestjs/auth';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { seedUser } from '../utils/test-telpers';

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

  it('Should protect the history endpoints (401 without a session)', async () => {
    expect((await http().get('/v1/me/service-agreements')).status).toBe(401);
    expect((await http().get('/v1/me/service-agreements/abc')).status).toBe(401);
  });

  it('Should reject a malformed :id with 400 once past the guard (before any DB access)', async () => {
    const res = await http()
      .get('/v1/me/service-agreements/not-a-uuid')
      .set('x-test-user', seedUser());
    expect(res.status).toBe(400);
  });
});
