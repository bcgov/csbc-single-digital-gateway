import { describe, expect, it, vi } from 'vitest';

// openid-client v6 is loaded via dynamic import() inside the flow helpers; mock it.
vi.mock('openid-client', () => ({
  randomPKCECodeVerifier: () => 'verifier-xyz',
  calculatePKCECodeChallenge: () => Promise.resolve('challenge-xyz'),
  randomState: () => 'state-abc',
  randomNonce: () => 'nonce-def',
  buildAuthorizationUrl: (_config: unknown, params: Record<string, string>) =>
    new URL(`https://idp.example.com/authorize?${new URLSearchParams(params).toString()}`),
  authorizationCodeGrant: () =>
    Promise.resolve({ claims: () => ({ sub: 'user-1', email: 'u@e.com' }) }),
}));

import { buildLoginUrl, completeLogin } from '../src/auth/auth.flow';
import type { OidcTransaction } from '../src/auth/auth.flow';

const config = {} as never;
const options = { redirectUri: 'http://localhost:4001/auth/callback', scopes: ['openid', 'email'] };

describe('buildLoginUrl', () => {
  it('stores PKCE/state/nonce in the session and returns the authorize URL', async () => {
    const session: { oidcTx?: OidcTransaction } = {};
    const url = await buildLoginUrl(config, options, session);

    expect(session.oidcTx).toEqual({
      state: 'state-abc',
      nonce: 'nonce-def',
      codeVerifier: 'verifier-xyz',
    });
    expect(url.searchParams.get('code_challenge')).toBe('challenge-xyz');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('state-abc');
    expect(url.searchParams.get('redirect_uri')).toBe(options.redirectUri);
  });
});

describe('completeLogin', () => {
  it('exchanges the code with the stored verifier/state/nonce, returns claims, clears oidcTx', async () => {
    const session: { oidcTx?: OidcTransaction } = {
      oidcTx: { state: 'state-abc', nonce: 'nonce-def', codeVerifier: 'verifier-xyz' },
    };
    const claims = await completeLogin(
      config,
      new URL('http://localhost:4001/auth/callback?code=c&state=state-abc'),
      session,
    );

    expect(claims.sub).toBe('user-1');
    expect(session.oidcTx).toBeUndefined();
  });

  it('throws (fail-closed) when there is no OIDC transaction in the session', async () => {
    await expect(
      completeLogin(config, new URL('http://localhost:4001/auth/callback'), {}),
    ).rejects.toThrow();
  });
});
