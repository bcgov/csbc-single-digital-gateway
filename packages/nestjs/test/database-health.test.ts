import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { DatabaseModule } from '../src/database';
import { DatabaseHealthIndicator } from '../src/database-health';
import { HealthModule } from '../src/health';

// Boot a health app whose registered DB client pings with the given query behaviour.
async function bootApp(query: () => Promise<unknown>): Promise<INestApplication> {
  const fakeClient = { $client: { query } };
  const moduleRef = await Test.createTestingModule({
    imports: [
      DatabaseModule.forRoot({ client: fakeClient }),
      HealthModule.forRoot({ readiness: [DatabaseHealthIndicator] }),
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

let app: INestApplication | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('DatabaseHealthIndicator via /health/ready', () => {
  it('reports the database up (200) when the ping succeeds', async () => {
    app = await bootApp(() => Promise.resolve([{ '?column?': 1 }]));
    const res = await request(app.getHttpServer()).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.database.status).toBe('up');
  });

  it('reports the database down (503) when the ping fails', async () => {
    app = await bootApp(() => Promise.reject(new Error('ECONNREFUSED 127.0.0.1:5599')));
    const res = await request(app.getHttpServer()).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.error.database.status).toBe('down');
  });

  it('does not leak the raw connection error into the health payload', async () => {
    app = await bootApp(() =>
      Promise.reject(new Error('password authentication failed for user "postgres"')),
    );
    const res = await request(app.getHttpServer()).get('/health/ready');

    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('password authentication failed');
  });
});

describe('HealthModule readiness mechanism', () => {
  it('forRoot with no readiness indicators leaves /ready green', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule.forRoot()],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const res = await request(app.getHttpServer()).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('keeps /health/live independent of the database (always 200)', async () => {
    app = await bootApp(() => Promise.reject(new Error('db down')));
    const res = await request(app.getHttpServer()).get('/health/live');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
