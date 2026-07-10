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
  // m2m auth (required, fail-fast): the OIDC issuer whose client-credentials tokens are
  // accepted (the Keycloak sdg realm — machine identities live there, see feature 101).
  OIDC_ISSUER: z.url(),
  // The audience(s) every accepted token's `aud` must contain — comma-separated, ANY-of.
  // Issuer alone is NOT enough — staff login tokens share the issuer and must be rejected.
  // Where the IdP can't add a custom audience mapper (e.g. the CSS standard realm), list the
  // allowed m2m caller client ids instead (their tokens carry their own client id as `aud`).
  M2M_AUDIENCE: z
    .string()
    .min(1)
    .default('notification-service')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== ''),
    )
    .refine((list) => list.length > 0, {
      message: 'M2M_AUDIENCE must contain at least one audience',
    }),
  // Email delivery worker. Defaults target the compose Mailpit (dev SMTP); SMTP_URL may carry
  // credentials in real environments (smtp[s]://user:pass@host:port) — env/secrets only.
  SMTP_URL: z.url().default('smtp://localhost:1025'),
  MAIL_FROM: z.string().min(3).default('no-reply@sdg.local'),
  EMAIL_WORKER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  EMAIL_WORKER_INTERVAL_MS: z.coerce.number().int().min(250).default(5000),
  EMAIL_WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  EMAIL_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
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
