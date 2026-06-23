import { describe, expect, it } from 'vitest';

import { mapClaims } from '../src/auth/oidc-user-sync.service';

describe('mapClaims', () => {
  it('maps a full set of claims', () => {
    expect(
      mapClaims({
        sub: 's-1',
        iss: 'https://idp.example.com',
        email: 'a@b.com',
        name: 'A B',
        given_name: 'A',
        family_name: 'B',
      }),
    ).toEqual({
      issuer: 'https://idp.example.com',
      sub: 's-1',
      email: 'a@b.com',
      displayName: 'A B',
      givenName: 'A',
      familyName: 'B',
    });
  });

  it('falls back to empty strings for missing given/family names', () => {
    const m = mapClaims({ sub: 's', iss: 'i', preferred_username: 'puser' });
    expect(m.givenName).toBe('');
    expect(m.familyName).toBe('');
    expect(m.email).toBeUndefined();
  });

  it('derives displayName: name → preferred_username → email → sub', () => {
    expect(mapClaims({ sub: 'x', iss: 'i', name: 'N' }).displayName).toBe('N');
    expect(mapClaims({ sub: 'x', iss: 'i', preferred_username: 'p' }).displayName).toBe('p');
    expect(mapClaims({ sub: 'x', iss: 'i', email: 'e@x' }).displayName).toBe('e@x');
    expect(mapClaims({ sub: 'x', iss: 'i' }).displayName).toBe('x');
  });
});
