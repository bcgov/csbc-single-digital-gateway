import type { Params } from 'nestjs-pino';
import type { Options } from 'pino-http';

export interface LoggerModuleOptions {
  /** pino level (default `'info'`). */
  level?: string;
  /** Enable the `pino-pretty` transport — development only (it spins a worker thread). */
  pretty?: boolean;
  /** Extra redact paths, merged AFTER the secure defaults (defaults can't be dropped). */
  redact?: string[];
  /** Logger name attached to every record. */
  name?: string;
}

// Secret headers scrubbed from every log record before emission.
const DEFAULT_REDACT = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

/**
 * Build the nestjs-pino `Params` from a small option set: pino-http with `info` default
 * level, secret-header redaction, request auto-logging, and the `pino-pretty` transport when
 * `pretty` is set. Pure (no I/O) so it is unit-testable.
 */
export function buildLoggerParams(options: LoggerModuleOptions = {}): Params {
  const { level = 'info', pretty = false, redact = [], name } = options;

  const pinoHttp: Options = {
    level,
    autoLogging: true,
    redact: [...DEFAULT_REDACT, ...redact],
  };

  if (pretty) {
    pinoHttp.transport = {
      target: 'pino-pretty',
      options: { singleLine: false, translateTime: 'SYS:standard' },
    };
  }

  if (name !== undefined) {
    pinoHttp.name = name;
  }

  return { pinoHttp };
}
