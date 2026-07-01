import { describe, expect, it, vi } from 'vitest';

// openid-client v6 is loaded via dynamic import() inside the flow helpers; mock it.
vi.mock('openid-client', () => ({
  randomPKCECodeVerifier: () => 'verifier-xyz',
  calculatePKCECodeChallenge: () => Promise.resolve('challenge-xyz'),
  randomState: () => 'state-abc',
  randomNonce: () => 'nonce-def',
  buildAuthorizationUrl: (_config: unknown, params: Record<string, string>) =>
    new URL(`https://idp.example.com/authorize?${new URLSearchParams(params).toString()}`),
  // Reject when the callback URL is flagged, so the one-time-transaction (fail) path is testable.
  authorizationCodeGrant: (_config: unknown, url: URL) => {
    if (String(url).includes('boom')) {
      return Promise.reject(new Error('state mismatch'));
    }
    return Promise.resolve({
      claims: () => ({ sub: 'user-1', email: 'u@e.com' }),
      id_token: 'id-token-1',
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      expires_in: 300,
    });
  },
  refreshTokenGrant: (_config: unknown, refreshToken: string) =>
    Promise.resolve(
      refreshToken === 'no-rotate'
        ? { access_token: 'access-2', expires_in: 300 }
        : { access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 300 },
    ),
  buildEndSessionUrl: (_config: unknown, params: Record<string, string>) =>
    new URL(`https://idp.example.com/logout?${new URLSearchParams(params).toString()}`),
}));

import {
  buildLoginUrl,
  buildLogoutUrl,
  completeLogin,
  refreshTokens,
  resolvePostLoginTarget,
  sanitizeReturnTo,
} from '../src/auth/auth.flow';
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
  it('exchanges the code with the stored verifier/state/nonce, returns claims + id_token, clears oidcTx', async () => {
    const session: { oidcTx?: OidcTransaction } = {
      oidcTx: { state: 'state-abc', nonce: 'nonce-def', codeVerifier: 'verifier-xyz' },
    };
    const { claims, idToken } = await completeLogin(
      config,
      new URL('http://localhost:4001/auth/callback?code=c&state=state-abc'),
      session,
    );

    expect(claims.sub).toBe('user-1');
    expect(idToken).toBe('id-token-1');
    expect(session.oidcTx).toBeUndefined();
  });

  it('returns the token set (access/refresh + computed expiresAt)', async () => {
    const session: { oidcTx?: OidcTransaction } = {
      oidcTx: { state: 'state-abc', nonce: 'nonce-def', codeVerifier: 'verifier-xyz' },
    };
    const { tokens } = await completeLogin(
      config,
      new URL('http://localhost:4001/auth/callback?code=c&state=state-abc'),
      session,
    );

    expect(tokens.accessToken).toBe('access-1');
    expect(tokens.refreshToken).toBe('refresh-1');
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
  });

  it('throws (fail-closed) when there is no OIDC transaction in the session', async () => {
    await expect(
      completeLogin(config, new URL('http://localhost:4001/auth/callback'), {}),
    ).rejects.toThrow();
  });

  it('consumes the transaction even when the exchange fails (one-time use, no replay)', async () => {
    const session: { oidcTx?: OidcTransaction } = {
      oidcTx: { state: 'state-abc', nonce: 'nonce-def', codeVerifier: 'verifier-xyz' },
    };
    await expect(
      completeLogin(
        config,
        new URL('http://localhost:4001/auth/callback?code=boom&state=state-abc'),
        session,
      ),
    ).rejects.toThrow();
    // The verifier/state/nonce are gone, so a replayed callback can't be retried.
    expect(session.oidcTx).toBeUndefined();
  });
});

describe('buildLogoutUrl', () => {
  it('builds the end_session URL with id_token_hint and post_logout_redirect_uri', async () => {
    const url = await buildLogoutUrl(config, {
      idToken: 'id-token-1',
      postLogoutRedirect: 'http://localhost:3000/',
    });

    expect(url.searchParams.get('id_token_hint')).toBe('id-token-1');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3000/');
  });

  it('omits params that were not provided', async () => {
    const url = await buildLogoutUrl(config, {});
    expect(url.searchParams.get('id_token_hint')).toBeNull();
    expect(url.searchParams.get('post_logout_redirect_uri')).toBeNull();
  });
});

describe('sanitizeReturnTo', () => {
  it('accepts a site-relative path (with query) unchanged', () => {
    expect(sanitizeReturnTo('/app/services/42?tab=details')).toBe('/app/services/42?tab=details');
  });

  it('accepts the bare root path', () => {
    expect(sanitizeReturnTo('/')).toBe('/');
  });

  it('rejects an absolute URL (open-redirect vector)', () => {
    expect(sanitizeReturnTo('https://evil.example.com')).toBeUndefined();
  });

  it('rejects a protocol-relative URL (//host)', () => {
    expect(sanitizeReturnTo('//evil.example.com')).toBeUndefined();
  });

  it('rejects a backslash-smuggled path (/\\host)', () => {
    expect(sanitizeReturnTo('/\\evil.example.com')).toBeUndefined();
  });

  it('rejects a path with an embedded scheme (contains ://)', () => {
    expect(sanitizeReturnTo('/redirect?next=http://evil.example.com')).toBeUndefined();
  });

  it('rejects control characters (CRLF header-splitting)', () => {
    expect(sanitizeReturnTo('/app\r\nSet-Cookie: x=1')).toBeUndefined();
  });

  it('rejects a value that does not start with a slash', () => {
    expect(sanitizeReturnTo('app/foo')).toBeUndefined();
  });

  it('rejects non-string, empty, and over-long input', () => {
    expect(sanitizeReturnTo(undefined)).toBeUndefined();
    expect(sanitizeReturnTo(42)).toBeUndefined();
    expect(sanitizeReturnTo('')).toBeUndefined();
    expect(sanitizeReturnTo(`/${'a'.repeat(2048)}`)).toBeUndefined();
  });
});

describe('resolvePostLoginTarget', () => {
  const postLoginRedirect = 'http://localhost:3000/app';

  it('pins a safe returnTo onto the origin of postLoginRedirect', () => {
    expect(resolvePostLoginTarget('/app/services/42?tab=x', postLoginRedirect)).toBe(
      'http://localhost:3000/app/services/42?tab=x',
    );
  });

  it('falls back to postLoginRedirect when returnTo is absent', () => {
    expect(resolvePostLoginTarget(undefined, postLoginRedirect)).toBe(postLoginRedirect);
  });

  it('falls back to postLoginRedirect when returnTo is unsafe (defense-in-depth)', () => {
    // Even if a full URL somehow reached the session, resolution must not honor its origin.
    expect(resolvePostLoginTarget('https://evil.example.com/x', postLoginRedirect)).toBe(
      postLoginRedirect,
    );
    expect(resolvePostLoginTarget('//evil.example.com', postLoginRedirect)).toBe(postLoginRedirect);
  });
});

describe('refreshTokens', () => {
  it('exchanges the refresh token for a fresh set, persisting a rotated refresh token', async () => {
    const tokens = await refreshTokens(config, 'refresh-1');
    expect(tokens.accessToken).toBe('access-2');
    expect(tokens.refreshToken).toBe('refresh-2');
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
  });

  it('retains the current refresh token when the IdP rotates none', async () => {
    const tokens = await refreshTokens(config, 'no-rotate');
    expect(tokens.accessToken).toBe('access-2');
    expect(tokens.refreshToken).toBe('no-rotate');
  });
});
