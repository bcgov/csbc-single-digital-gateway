import { type INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { setupSwagger } from '../../src/swagger';

describe('swagger docs (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    setupSwagger(app, 'development');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves a base doc with unversioned routes (health/auth)', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json');
    expect(res.status).toBe(200);
    const paths = Object.keys(res.body.paths as Record<string, unknown>);
    expect(paths.some((path) => path.startsWith('/health'))).toBe(true);
    expect(paths.some((path) => path.startsWith('/v1'))).toBe(false);
  });

  it('serves a v1 doc (empty — no feature modules yet)', async () => {
    const res = await request(app.getHttpServer()).get('/v1/docs-json');
    expect(res.status).toBe(200);
    const paths = Object.keys(res.body.paths as Record<string, unknown>);
    expect(paths.every((path) => path.startsWith('/v1'))).toBe(true);
  });
});
