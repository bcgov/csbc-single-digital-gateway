import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// NOTIFICATION_DATABASE_URL is provided by test/setup.ts; createDatabase() is lazy, so no
// real Postgres is needed — a socket is only opened on the first query.
describe('notification-service database wiring (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('makes the Drizzle client injectable via the DATABASE_CLIENT token', () => {
    const db = app.get<{ select: unknown; $client: unknown }>(DATABASE_CLIENT);
    expect(db).toBeDefined();
    expect(typeof db.select).toBe('function');
    expect(db.$client).toBeDefined();
  });

  it('keeps health endpoints working alongside the database module', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
