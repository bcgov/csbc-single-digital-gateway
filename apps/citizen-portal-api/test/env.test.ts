import { describe, expect, it } from 'vitest';
import { validateEnv } from '../src/config/env.schema';

// Required (no-default) vars a valid base env must always supply.
const DB_URL = 'postgresql://postgres:postgres@localhost:5432/sdg';
const base = {
  NOTIFICATIONS_M2M_CLIENT_SECRET: 'test-secret',
  DATABASE_URL: DB_URL,
  OIDC_ISSUER: 'http://localhost:8080/realms/citizens',
  OIDC_CLIENT_ID: 'citizen-portal-api',
  OIDC_CLIENT_SECRET: 'secret',
  OIDC_REDIRECT_URI: 'http://localhost:4000/auth/callback',
  AUTH_SESSION_SECRET: 'a-long-enough-session-secret',
  AUTH_POST_LOGIN_REDIRECT: 'http://localhost:3000',
};

describe('env validation', () => {
  it('defaults the web origin(s) used for notification email links', () => {
    const env = validateEnv({ ...base });
    expect(env.CITIZEN_WEB_URL).toBe('http://localhost:3000');
    expect(env.PLATFORM_WEB_URL).toBe('http://localhost:3001');
  });

  it('defaults the outbox relay settings and requires the m2m client secret', () => {
    const env = validateEnv({ ...base });
    expect(env.NOTIFICATION_SERVICE_URL).toBe('http://localhost:4002');
    expect(env.NOTIFICATIONS_M2M_ISSUER).toBe('http://localhost:8080/realms/sdg');
    expect(env.NOTIFICATIONS_M2M_CLIENT_ID).toBe('citizen-portal-api-m2m');
    expect(env.OUTBOX_RELAY_ENABLED).toBe(true);
    expect(env.OUTBOX_RELAY_INTERVAL_MS).toBe(5000);
    expect(env.OUTBOX_RELAY_MAX_ATTEMPTS).toBe(5);
    const { NOTIFICATIONS_M2M_CLIENT_SECRET: _drop, ...withoutSecret } = base;
    expect(() => validateEnv(withoutSecret)).toThrow(/Invalid environment/);
  });

  it('applies defaults for NODE_ENV, PORT (4000), LOG_LEVEL, and VALKEY_URL', () => {
    const env = validateEnv({ ...base });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.DATABASE_URL).toBe(DB_URL);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.VALKEY_URL).toBe('redis://localhost:6380');
  });

  it('defaults AUTH_DEFAULT_ROLE to citizen and SESSION_KEY_PREFIX to cpa:', () => {
    const env = validateEnv({ ...base });
    expect(env.AUTH_DEFAULT_ROLE).toBe('citizen');
    expect(env.SESSION_KEY_PREFIX).toBe('cpa:');
  });

  it('rejects staff/admin as AUTH_DEFAULT_ROLE (cross-audience — citizen-portal-api stamps citizen only)', () => {
    expect(() => validateEnv({ ...base, AUTH_DEFAULT_ROLE: 'staff' })).toThrow(
      /Invalid environment/,
    );
    expect(() => validateEnv({ ...base, AUTH_DEFAULT_ROLE: 'admin' })).toThrow(
      /Invalid environment/,
    );
  });

  it('rejects an AUTH_DEFAULT_ROLE outside the role enum', () => {
    expect(() => validateEnv({ ...base, AUTH_DEFAULT_ROLE: 'superuser' })).toThrow(
      /Invalid environment/,
    );
  });

  it('defaults AUTH_RP_LOGOUT to false and parses it as a boolean', () => {
    expect(validateEnv({ ...base }).AUTH_RP_LOGOUT).toBe(false);
    expect(validateEnv({ ...base, AUTH_RP_LOGOUT: 'true' }).AUTH_RP_LOGOUT).toBe(true);
  });

  it('defaults AUTH_TOKEN_REFRESH_SKEW_SECONDS to 30 and coerces from a string', () => {
    expect(validateEnv({ ...base }).AUTH_TOKEN_REFRESH_SKEW_SECONDS).toBe(30);
    expect(
      validateEnv({ ...base, AUTH_TOKEN_REFRESH_SKEW_SECONDS: '120' })
        .AUTH_TOKEN_REFRESH_SKEW_SECONDS,
    ).toBe(120);
  });

  it('parses AUTH_ALLOWED_ORIGINS into a trimmed, comma-split list (default: citizen SPA :3000)', () => {
    expect(validateEnv({ ...base }).AUTH_ALLOWED_ORIGINS).toEqual(['http://localhost:3000']);
    expect(
      validateEnv({ ...base, AUTH_ALLOWED_ORIGINS: 'https://a.gov, https://b.gov' })
        .AUTH_ALLOWED_ORIGINS,
    ).toEqual(['https://a.gov', 'https://b.gov']);
    expect(validateEnv({ ...base, AUTH_ALLOWED_ORIGINS: '' }).AUTH_ALLOWED_ORIGINS).toEqual([]);
  });

  it('requires the OIDC settings (fail-fast)', () => {
    expect(() => validateEnv({ DATABASE_URL: DB_URL })).toThrow(/Invalid environment/);
  });

  it('rejects too-short AUTH_SESSION_SECRET', () => {
    expect(() => validateEnv({ ...base, AUTH_SESSION_SECRET: 'short' })).toThrow(
      /Invalid environment/,
    );
  });

  it('throws on an invalid LOG_LEVEL', () => {
    expect(() => validateEnv({ ...base, LOG_LEVEL: 'verbose' })).toThrow(/Invalid environment/);
  });

  it('coerces PORT from a string', () => {
    expect(validateEnv({ ...base, PORT: '8080' }).PORT).toBe(8080);
  });

  it('ignores unknown environment variables', () => {
    const env = validateEnv({ ...base, SOME_OTHER: 'x' });
    expect(env).not.toHaveProperty('SOME_OTHER');
  });

  it('throws when DATABASE_URL is missing (required, fail-fast)', () => {
    expect(() => validateEnv({})).toThrow(/Invalid environment/);
  });

  it('throws on an invalid DATABASE_URL', () => {
    expect(() => validateEnv({ DATABASE_URL: 'not-a-url' })).toThrow(/Invalid environment/);
  });
});
