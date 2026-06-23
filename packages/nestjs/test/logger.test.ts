import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { buildLoggerParams, Logger, LoggerModule } from '../src/logger';

// Narrow view of the pino-http options buildLoggerParams produces.
interface PinoHttpOptions {
  level?: string;
  redact?: string[];
  autoLogging?: boolean;
  transport?: { target?: string };
}
const pinoHttp = (params: ReturnType<typeof buildLoggerParams>): PinoHttpOptions =>
  params.pinoHttp as PinoHttpOptions;

describe('buildLoggerParams', () => {
  it('defaults to info level, redacts secret headers, no pretty transport', () => {
    const opts = pinoHttp(buildLoggerParams());
    expect(opts.level).toBe('info');
    expect(opts.autoLogging).toBe(true);
    expect(opts.transport).toBeUndefined();
    expect(opts.redact).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ]),
    );
  });

  it('enables the pino-pretty transport only when pretty is true', () => {
    expect(pinoHttp(buildLoggerParams({ pretty: true })).transport?.target).toBe('pino-pretty');
    expect(pinoHttp(buildLoggerParams({ pretty: false })).transport).toBeUndefined();
  });

  it('passes the configured level through', () => {
    expect(pinoHttp(buildLoggerParams({ level: 'debug' })).level).toBe('debug');
  });

  it('merges caller redact paths with the secure defaults', () => {
    const redact = pinoHttp(buildLoggerParams({ redact: ['req.body.password'] })).redact ?? [];
    expect(redact).toContain('req.body.password');
    expect(redact).toContain('req.headers.authorization');
  });
});

describe('LoggerModule', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('forRoot provides an injectable pino Logger', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule.forRoot({ level: 'silent' })],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const logger = app.get(Logger);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe('function');
  });

  it('forRootAsync builds params from a factory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule.forRootAsync({ useFactory: () => ({ level: 'silent' }) })],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    expect(app.get(Logger)).toBeDefined();
  });
});
