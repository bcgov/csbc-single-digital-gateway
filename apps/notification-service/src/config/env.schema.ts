import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4002),
  // Required, fail-fast: there is no safe universal default for a DB connection string,
  // and a silent localhost fallback in production is worse than failing at boot.
  NOTIFICATION_DATABASE_URL: z.url(),
  // DB TLS (optional). PGSSLMODE = disable | no-verify | verify-ca | verify-full;
  // NOTIFICATION_DATABASE_CA_CERT is the CA PEM (e.g. Crunchy's ca.crt) used to verify the
  // server. Unset → no TLS (local dev).
  PGSSLMODE: z.string().optional(),
  NOTIFICATION_DATABASE_CA_CERT: z.string().optional(),
  // pino log level; operators tune verbosity without code changes.
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate function for `@nestjs/config`'s `ConfigModule.forRoot({ validate })`.
 * Fails fast (throws before the server listens) with a readable message when the
 * environment is invalid. The returned object becomes the config `ConfigService` serves.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
