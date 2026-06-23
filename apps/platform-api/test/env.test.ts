import { describe, expect, it } from 'vitest';
import { validateEnv } from '../src/config/env.schema';

// Required (no-default) vars a valid base env must always supply.
const DB_URL = 'postgresql://postgres:postgres@localhost:5432/sdg';
const base = {
  DATABASE_URL: DB_URL,
  OIDC_ISSUER: 'http://localhost:8080/realms/sdg',
  OIDC_CLIENT_ID: 'platform-api',
  OIDC_CLIENT_SECRET: 'secret',
  OIDC_REDIRECT_URI: 'http://localhost:4001/auth/callback',
  AUTH_SESSION_SECRET: 'a-long-enough-session-secret',
  AUTH_POST_LOGIN_REDIRECT: 'http://localhost:3000/app',
};

describe('env validation', () => {
  it('applies defaults for NODE_ENV, PORT, LOG_LEVEL, and VALKEY_URL', () => {
    const env = validateEnv({ ...base });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4001);
    expect(env.DATABASE_URL).toBe(DB_URL);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.VALKEY_URL).toBe('redis://localhost:6380');
  });

  it('requires the OIDC settings (fail-fast)', () => {
    expect(() => validateEnv({ DATABASE_URL: DB_URL })).toThrow(/Invalid environment/);
  });

  it('rejects too-short AUTH_SESSION_SECRET', () => {
    expect(() => validateEnv({ ...base, AUTH_SESSION_SECRET: 'short' })).toThrow(
      /Invalid environment/,
    );
  });

  it('accepts a valid LOG_LEVEL', () => {
    expect(validateEnv({ ...base, LOG_LEVEL: 'debug' }).LOG_LEVEL).toBe('debug');
  });

  it('throws on an invalid LOG_LEVEL', () => {
    expect(() => validateEnv({ ...base, LOG_LEVEL: 'verbose' })).toThrow(/Invalid environment/);
  });

  it('coerces PORT from a string', () => {
    expect(validateEnv({ ...base, PORT: '8080' }).PORT).toBe(8080);
  });

  it('accepts each valid NODE_ENV value', () => {
    expect(validateEnv({ ...base, NODE_ENV: 'production' }).NODE_ENV).toBe('production');
    expect(validateEnv({ ...base, NODE_ENV: 'test' }).NODE_ENV).toBe('test');
  });

  it('ignores unknown environment variables', () => {
    const env = validateEnv({ ...base, SOME_OTHER: 'x' });
    expect(env).not.toHaveProperty('SOME_OTHER');
  });

  it('throws on an invalid NODE_ENV', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(/Invalid environment/);
  });

  it('throws on a non-numeric PORT', () => {
    expect(() => validateEnv({ ...base, PORT: 'not-a-number' })).toThrow();
  });

  it('throws when DATABASE_URL is missing (required, fail-fast)', () => {
    expect(() => validateEnv({})).toThrow(/Invalid environment/);
  });

  it('throws on an invalid DATABASE_URL', () => {
    expect(() => validateEnv({ DATABASE_URL: 'not-a-url' })).toThrow(/Invalid environment/);
  });
});
