import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // Required, fail-fast: there is no safe universal default for a DB connection string,
  // and a silent localhost fallback in production is worse than failing at boot.
  DATABASE_URL: z.url(),
  // DB TLS (optional). PGSSLMODE = disable | no-verify | verify-ca | verify-full; DATABASE_CA_CERT
  // is the CA PEM (e.g. Crunchy's ca.crt) used to verify the server. Unset → no TLS (local dev).
  PGSSLMODE: z.string().optional(),
  DATABASE_CA_CERT: z.string().optional(),
  // pino log level; operators tune verbosity without code changes.
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  // OIDC (BFF) — required, fail-fast (no safe defaults for an IdP / secret).
  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_REDIRECT_URI: z.url(),
  AUTH_SESSION_SECRET: z.string().min(16),
  AUTH_POST_LOGIN_REDIRECT: z.url(),
  // Baseline role stamped on a user's FIRST login (re-login never changes roles). Constrained to
  // this app's audience: citizen-portal-api may stamp ONLY `citizen` — never staff/admin (those
  // belong to the staff realm / platform-api). Fail-fast on a cross-audience value.
  AUTH_DEFAULT_ROLE: z.enum(['citizen']).default('citizen'),
  // Valkey key prefix for this app's sessions + per-user index. MUST be unique per app sharing a
  // Valkey, or sessions/"logout everywhere" collide across apps. Keys: `${prefix}sess:` etc.
  SESSION_KEY_PREFIX: z.string().min(1).default('cpa:'),
  // RP-initiated logout: when true, /auth/logout also bounces the browser through the IdP
  // `end_session_endpoint`. Off by default (local session destroy is always sufficient).
  AUTH_RP_LOGOUT: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // Where the IdP returns the browser after RP-initiated logout (pre-registered at the IdP).
  AUTH_POST_LOGOUT_REDIRECT: z.url().optional(),
  // Refresh the access token this many seconds before it expires (lazy-refresh skew window).
  AUTH_TOKEN_REFRESH_SKEW_SECONDS: z.coerce.number().int().nonnegative().default(30),
  // CSRF Origin allowlist (comma-separated) for mutating requests. Defaults to the local SPA dev
  // origin; set to the real app origin(s) in production. Empty value => CSRF guard inert.
  AUTH_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
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
