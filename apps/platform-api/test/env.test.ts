import { describe, expect, it } from 'vitest';
import { validateEnv } from '../src/config/env.schema';

describe('env validation', () => {
  it('applies defaults for an empty environment', () => {
    const env = validateEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4001);
  });

  it('coerces PORT from a string', () => {
    expect(validateEnv({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('accepts each valid NODE_ENV value', () => {
    expect(validateEnv({ NODE_ENV: 'production' }).NODE_ENV).toBe('production');
    expect(validateEnv({ NODE_ENV: 'test' }).NODE_ENV).toBe('test');
  });

  it('ignores unknown environment variables', () => {
    const env = validateEnv({ PORT: '4001', SOME_OTHER: 'x' });
    expect(env).not.toHaveProperty('SOME_OTHER');
  });

  it('throws on an invalid NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(/Invalid environment/);
  });

  it('throws on a non-numeric PORT', () => {
    expect(() => validateEnv({ PORT: 'not-a-number' })).toThrow();
  });
});
