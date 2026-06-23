import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AUTH_OPTIONS } from '@repo/nestjs/auth';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// Under NODE_ENV=test the AuthModule factory injects a stub config and skips OIDC discovery, so
// AppModule boots without a running Keycloak. The live login round-trip is verified separately.
describe('platform-api auth wiring (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('boots with the auth module configured from env', () => {
    const options = app.get<{ clientId: string; issuer: string }>(AUTH_OPTIONS);
    expect(options.clientId).toBe('platform-api');
    expect(options.issuer).toContain('/realms/sdg');
  });

  it('keeps health endpoints working alongside auth', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
