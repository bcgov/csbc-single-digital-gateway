import { describe, expect, it } from 'vitest';

import { resolvePgSsl } from '../src/ssl';

const CA = '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----\n';

describe('resolvePgSsl', () => {
  it('returns undefined (no TLS) when mode is unset, empty, or disable', () => {
    expect(resolvePgSsl({})).toBeUndefined();
    expect(resolvePgSsl({ mode: '' })).toBeUndefined();
    expect(resolvePgSsl({ mode: 'disable' })).toBeUndefined();
    // a CA without a mode is still "no TLS" — mode drives the decision
    expect(resolvePgSsl({ mode: undefined, ca: CA })).toBeUndefined();
  });

  it('no-verify encrypts without verification', () => {
    expect(resolvePgSsl({ mode: 'no-verify' })).toEqual({ rejectUnauthorized: false });
    expect(resolvePgSsl({ mode: 'no-verify', ca: CA })).toEqual({
      rejectUnauthorized: false,
      ca: CA,
    });
  });

  it('verify-full verifies chain + hostname against the CA', () => {
    expect(resolvePgSsl({ mode: 'verify-full', ca: CA })).toEqual({
      ca: CA,
      rejectUnauthorized: true,
    });
  });

  it('require is treated as verify-full', () => {
    expect(resolvePgSsl({ mode: 'require', ca: CA })).toEqual({ ca: CA, rejectUnauthorized: true });
  });

  it('verify-ca verifies the chain but skips the hostname check', () => {
    const ssl = resolvePgSsl({ mode: 'verify-ca', ca: CA });
    expect(ssl).toMatchObject({ ca: CA, rejectUnauthorized: true });
    // checkServerIdentity returns undefined → hostname mismatch is tolerated
    const check = (ssl as { checkServerIdentity?: () => unknown }).checkServerIdentity;
    expect(check?.()).toBeUndefined();
  });

  it('ignores a blank/whitespace CA', () => {
    expect(resolvePgSsl({ mode: 'verify-full', ca: '   ' })).toEqual({ rejectUnauthorized: true });
  });
});
