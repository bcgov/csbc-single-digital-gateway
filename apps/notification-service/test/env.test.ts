import { describe, expect, it } from 'vitest';
import { validateEnv } from '../src/config/env.schema';

// Required (no-default) vars a valid base env must always supply.
const DB_URL = 'postgresql://postgres:postgres@localhost:5433/sdg_notifications';
const base = {
  NOTIFICATION_DATABASE_URL: DB_URL,
  OIDC_ISSUER: 'http://localhost:8080/realms/sdg',
};

describe('env validation', () => {
  it('applies defaults for NODE_ENV, PORT (4002), and LOG_LEVEL', () => {
    const env = validateEnv({ ...base });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4002);
    expect(env.NOTIFICATION_DATABASE_URL).toBe(DB_URL);
    expect(env.LOG_LEVEL).toBe('info');
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

  it('throws when NOTIFICATION_DATABASE_URL is missing (required, fail-fast)', () => {
    expect(() => validateEnv({})).toThrow(/Invalid environment/);
  });

  it('requires OIDC_ISSUER (fail-fast) and rejects a non-URL value', () => {
    expect(() => validateEnv({ NOTIFICATION_DATABASE_URL: DB_URL })).toThrow(/Invalid environment/);
    expect(() => validateEnv({ ...base, OIDC_ISSUER: 'not-a-url' })).toThrow(/Invalid environment/);
  });

  it('defaults the email worker settings', () => {
    const env = validateEnv({ ...base });
    expect(env.SMTP_URL).toBe('smtp://localhost:1025');
    expect(env.MAIL_FROM).toBe('no-reply@sdg.local');
    expect(env.EMAIL_WORKER_ENABLED).toBe(true);
    expect(env.EMAIL_WORKER_INTERVAL_MS).toBe(5000);
    expect(env.EMAIL_WORKER_BATCH_SIZE).toBe(10);
    expect(env.EMAIL_MAX_ATTEMPTS).toBe(5);
  });

  it('parses EMAIL_WORKER_ENABLED=false and coerces the numeric worker settings', () => {
    const env = validateEnv({
      ...base,
      EMAIL_WORKER_ENABLED: 'false',
      EMAIL_WORKER_INTERVAL_MS: '10000',
      EMAIL_MAX_ATTEMPTS: '3',
    });
    expect(env.EMAIL_WORKER_ENABLED).toBe(false);
    expect(env.EMAIL_WORKER_INTERVAL_MS).toBe(10_000);
    expect(env.EMAIL_MAX_ATTEMPTS).toBe(3);
  });

  it('rejects an invalid SMTP_URL', () => {
    expect(() => validateEnv({ ...base, SMTP_URL: 'not a url' })).toThrow(/Invalid environment/);
  });

  it('defaults M2M_AUDIENCE to notification-service', () => {
    expect(validateEnv({ ...base }).M2M_AUDIENCE).toBe('notification-service');
    expect(validateEnv({ ...base, M2M_AUDIENCE: 'other-aud' }).M2M_AUDIENCE).toBe('other-aud');
  });

  it('throws on an invalid NOTIFICATION_DATABASE_URL', () => {
    expect(() => validateEnv({ NOTIFICATION_DATABASE_URL: 'not-a-url' })).toThrow(
      /Invalid environment/,
    );
  });

  it('accepts optional DB TLS settings', () => {
    const env = validateEnv({
      ...base,
      PGSSLMODE: 'verify-full',
      NOTIFICATION_DATABASE_CA_CERT: '-----BEGIN CERTIFICATE-----',
    });
    expect(env.PGSSLMODE).toBe('verify-full');
    expect(env.NOTIFICATION_DATABASE_CA_CERT).toContain('BEGIN CERTIFICATE');
  });
});
