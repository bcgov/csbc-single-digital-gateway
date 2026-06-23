import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4001),
  // Required, fail-fast: there is no safe universal default for a DB connection string,
  // and a silent localhost fallback in production is worse than failing at boot.
  DATABASE_URL: z.url(),
  // pino log level; operators tune verbosity without code changes.
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  // OIDC (BFF) — required, fail-fast (no safe defaults for an IdP / secret).
  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_REDIRECT_URI: z.url(),
  AUTH_SESSION_SECRET: z.string().min(16),
  AUTH_POST_LOGIN_REDIRECT: z.url(),
  // Session store (Valkey, Redis wire protocol); defaults to the local compose service.
  VALKEY_URL: z.string().default('redis://localhost:6380'),
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
