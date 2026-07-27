import { Controller, Get, VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// A probe route registered alongside AppModule: the module's APP_GUARD is global, so it
// must protect this route too (protected-by-default — no feature can forget the guard).
@Controller({ path: 'probe', version: '1' })
class ProbeController {
  @Get()
  probe(): { ok: boolean } {
    return { ok: true };
  }
}

describe('notification-service m2m guard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('401s a versioned route without a token', async () => {
    const res = await request(app.getHttpServer()).get('/v1/probe');
    expect(res.status).toBe(401);
  });

  it('401s an invalid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/probe')
      .set('Authorization', 'Bearer not-the-test-token');
    expect(res.status).toBe(401);
  });

  it('200s with the test verifier token (NODE_ENV=test stub — no live Keycloak)', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/probe')
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('keeps /health public (publicPaths)', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
