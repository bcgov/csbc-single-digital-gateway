import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4001),
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
  // this app's audience class: platform-api may stamp staff-class roles only — NEVER `citizen`
  // (that belongs to the citizens realm / citizen-portal-api). Fail-fast on a cross-audience value.
  AUTH_DEFAULT_ROLE: z.enum(['admin', 'staff']).default('staff'),
  // Valkey key prefix for this app's sessions + per-user index. MUST be unique per app sharing a
  // Valkey, or sessions/"logout everywhere" collide across apps. Keys: `${prefix}sess:` etc.
  SESSION_KEY_PREFIX: z.string().min(1).default('sdg:'),
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
  // Clock drift tolerated on JWT timestamp claims. Deliberately NO default: openid-client already
  // tolerates 30s, so leaving this unset keeps its built-in behaviour. Set it only to go HIGHER,
  // when a deployment has real drift beyond 30s between the IdP and this BFF.
  AUTH_CLOCK_TOLERANCE_SECONDS: z.coerce.number().int().positive().optional(),
  // CSRF Origin allowlist (comma-separated) for mutating requests. Defaults to the local SPA dev
  // origin; set to the real app origin(s) in production. Empty value => CSRF guard inert.
  AUTH_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3001')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  // Session store (Valkey, Redis wire protocol); defaults to the local compose service.
  VALKEY_URL: z.string().default('redis://localhost:6380'),
  // --- Notification email links (feature 127) ----------------------------------------------------
  // Public web origins the notification emails deep-link into. Producer-composed from config —
  // never from user input.
  CITIZEN_WEB_URL: z.url().default('http://localhost:3000'),

  // --- Outbox relay → notification-service (feature 110) ---------------------------------------
  // Base URL of the notification-service ingestion API.
  NOTIFICATION_SERVICE_URL: z.url().default('http://localhost:4002'),
  // Realm hosting the m2m clients — the sdg realm (feature 101), NOT necessarily this app's
  // own login issuer (citizen-portal-api logs in against the citizens realm).
  NOTIFICATIONS_M2M_ISSUER: z.url().default('http://localhost:8080/realms/sdg'),
  NOTIFICATIONS_M2M_CLIENT_ID: z.string().min(1).default('platform-api-m2m'),
  // Required, no default — a real secret (same posture as OIDC_CLIENT_SECRET).
  NOTIFICATIONS_M2M_CLIENT_SECRET: z.string().min(1),
  OUTBOX_RELAY_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  OUTBOX_RELAY_INTERVAL_MS: z.coerce.number().int().min(250).default(5000),
  OUTBOX_RELAY_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  OUTBOX_RELAY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),

  // --- Address geocoder (feature 154) ------------------------------------------------------------
  // BC OLS Physical Address Geocoder. OPTIONAL: when the API key is unset the CA/BC address-search
  // region is not registered, so the builder-preview address control hides the search field. The key
  // is a secret — server-side only, attached to the upstream request, never sent to the browser.
  BC_GEOCODER_URL: z.url().default('https://geocoder.api.gov.bc.ca'),
  BC_GEOCODER_API_KEY: z.string().optional(),
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
