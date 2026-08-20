import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

vi.mock('openid-client', () => ({
  randomPKCECodeVerifier: () => 'verifier-xyz',
  calculatePKCECodeChallenge: () => Promise.resolve('challenge-xyz'),
  randomState: () => 'state-abc',
  randomNonce: () => 'nonce-def',
  buildAuthorizationUrl: (_config: unknown, params: Record<string, string>) =>
    new URL(`https://idp.example.com/authorize?${new URLSearchParams(params).toString()}`),
  authorizationCodeGrant: vi.fn(() =>
    Promise.resolve({
      claims: () => ({ sub: 'user-1', email: 'u@e.com' }),
      id_token: 'id-token-1',
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      expires_in: 300,
    }),
  ),
  buildEndSessionUrl: (_config: unknown, params: Record<string, string>) =>
    new URL(`https://idp.example.com/logout?${new URLSearchParams(params).toString()}`),
}));

import { authorizationCodeGrant } from 'openid-client';
import { AuthController } from '../src/auth/auth.controller';
import { passthroughUserSync } from '../src/auth/auth.user-sync';
import type { SessionRegistry } from '../src/auth/session-registry';
import type { AuthModuleOptions, AuthUser } from '../src/auth/auth.types';

const options: AuthModuleOptions = {
  issuer: 'https://idp.example.com',
  clientId: 'client',
  clientSecret: 'secret',
  redirectUri: 'http://localhost:4001/auth/callback',
  scopes: ['openid', 'email'],
  postLoginRedirect: 'http://localhost:3000/app',
  session: { secret: 's' },
};

const makeRegistry = (): SessionRegistry & {
  track: ReturnType<typeof vi.fn>;
  revokeAll: ReturnType<typeof vi.fn>;
} => ({
  track: vi.fn(() => Promise.resolve()),
  revokeAll: vi.fn(() => Promise.resolve()),
});

const make = (opts: AuthModuleOptions = options, registry = makeRegistry()) => ({
  controller: new AuthController({} as never, opts, passthroughUserSync, registry),
  registry,
});

/** The shape oauth4webapi throws: an Error carrying a `code` string, not an exported class. */
const timestampError = (): Error =>
  Object.assign(
    new Error(
      'JWT timestamp claim value failed validation: unexpected JWT "exp" (expiration time) claim value, expiration is past current timestamp',
    ),
    { code: 'OAUTH_JWT_TIMESTAMP_CHECK_FAILED' },
  );

const pendingSession = (): Record<string, unknown> => ({
  oidcTx: { state: 'state-abc', nonce: 'nonce-def', codeVerifier: 'verifier-xyz' },
});

describe('AuthController.login', () => {
  it('stores the OIDC transaction and 302s to the IdP', async () => {
    const session: Record<string, unknown> = {};
    const res = { redirect: vi.fn() };
    await make().controller.login({ session } as never, res as never);

    expect(session.oidcTx).toMatchObject({ state: 'state-abc' });
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('idp.example.com/authorize'));
  });

  it('stores a safe returnTo on the session', async () => {
    const session: Record<string, unknown> = {};
    const res = { redirect: vi.fn() };
    await make().controller.login({ session } as never, res as never, '/app/services/42');

    expect(session.returnTo).toBe('/app/services/42');
  });

  it('ignores an unsafe returnTo (open-redirect vector)', async () => {
    const session: Record<string, unknown> = {};
    const res = { redirect: vi.fn() };
    await make().controller.login({ session } as never, res as never, 'https://evil.example.com');

    expect(session.returnTo).toBeUndefined();
  });
});

describe('AuthController.callback', () => {
  it('exchanges the code, writes the session user/id_token, tracks the session, and 302s', async () => {
    const session: Record<string, unknown> = {
      oidcTx: { state: 'state-abc', nonce: 'nonce-def', codeVerifier: 'verifier-xyz' },
    };
    const req = {
      originalUrl: '/auth/callback?code=c&state=state-abc',
      session,
      sessionID: 'sid-1',
    };
    const res = { redirect: vi.fn() };
    const { controller, registry } = make();
    await controller.callback(req as never, res as never);

    expect((session.authUser as AuthUser).id).toBe('user-1');
    expect(session.idToken).toBe('id-token-1');
    expect((session.tokens as { accessToken: string }).accessToken).toBe('access-1');
    expect(registry.track).toHaveBeenCalledWith('user-1', 'sid-1');
    expect(res.redirect).toHaveBeenCalledWith(options.postLoginRedirect);
  });

  it('redirects to a stored returnTo (pinned to the app origin) and clears it', async () => {
    const session: Record<string, unknown> = {
      oidcTx: { state: 'state-abc', nonce: 'nonce-def', codeVerifier: 'verifier-xyz' },
      returnTo: '/app/services/42?tab=x',
    };
    const req = {
      originalUrl: '/auth/callback?code=c&state=state-abc',
      session,
      sessionID: 'sid-1',
    };
    const res = { redirect: vi.fn() };
    await make().controller.callback(req as never, res as never);

    // options.postLoginRedirect is http://localhost:3000/app → origin http://localhost:3000
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/app/services/42?tab=x');
    expect(session.returnTo).toBeUndefined();
  });

  it('exchanges against the configured redirectUri path even when a proxy stripped a prefix', async () => {
    // redirectUri carries an `/api` prefix (external URL), but a reverse proxy strips it before the
    // BFF sees the request, so originalUrl lacks it. The token-exchange redirect_uri must still match
    // the authorization one (with `/api`) or the IdP returns invalid_grant (Incorrect redirect_uri).
    vi.mocked(authorizationCodeGrant).mockClear();
    const proxied: AuthModuleOptions = {
      ...options,
      redirectUri: 'https://app.example.gov/api/auth/callback',
    };
    const session: Record<string, unknown> = {
      oidcTx: { state: 'state-abc', nonce: 'nonce-def', codeVerifier: 'verifier-xyz' },
    };
    const req = {
      originalUrl: '/auth/callback?code=c&state=state-abc&iss=https%3A%2F%2Fidp.example.com',
      session,
      sessionID: 'sid-1',
    };
    const res = { redirect: vi.fn() };
    await make(proxied).controller.callback(req as never, res as never);

    const url = vi.mocked(authorizationCodeGrant).mock.calls[0]?.[1] as URL;
    expect(url.pathname).toBe('/api/auth/callback');
    expect(url.origin).toBe('https://app.example.gov');
    expect(url.searchParams.get('code')).toBe('c');
    expect(url.searchParams.get('state')).toBe('state-abc');
  });

  it('restarts login (302 to /auth/login) instead of 500 when a concurrent login clobbered the pending transaction', async () => {
    // A newer concurrent login overwrote oidcTx (state-new); this older callback carries state-old.
    const session: Record<string, unknown> = {
      oidcTx: { state: 'state-new', nonce: 'nonce-new', codeVerifier: 'verifier-new' },
      returnTo: '/app/services/42',
    };
    const req = {
      originalUrl: '/auth/callback?code=c&state=state-old',
      session,
      sessionID: 'sid-1',
    };
    const res = { redirect: vi.fn() };
    const { controller, registry } = make();
    await controller.callback(req as never, res as never);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/auth/login'));
    // The newer pending transaction is preserved so the concurrent login can still complete.
    expect(session.oidcTx).toBeDefined();
    // returnTo survives the restart, so the user still lands where they started.
    expect(session.returnTo).toBe('/app/services/42');
    expect(session.authUser).toBeUndefined();
    expect(registry.track).not.toHaveBeenCalled();
  });

  it('restarts login (302 to /auth/login) instead of 500 on a duplicate/replayed callback with no pending transaction', async () => {
    const session: Record<string, unknown> = {};
    const req = {
      originalUrl: '/auth/callback?code=c&state=state-abc',
      session,
      sessionID: 'sid-1',
    };
    const res = { redirect: vi.fn() };
    const { controller } = make();
    await controller.callback(req as never, res as never);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/auth/login'));
    expect(session.authUser).toBeUndefined();
  });

  // ── Expired id_token (oauth4webapi OAUTH_JWT_TIMESTAMP_CHECK_FAILED) ───────────────────────────
  // The authorization page sat open past the id_token lifespan, or the clocks disagree. A fresh
  // authorization mints a fresh token, so ONE restart fixes the first cause; the cap stops the
  // second from bouncing the browser between /login and /callback forever.

  it('restarts login instead of 500 when the id_token has already expired', async () => {
    vi.mocked(authorizationCodeGrant).mockRejectedValueOnce(timestampError());
    const session = pendingSession();
    const req = {
      originalUrl: '/auth/callback?code=c&state=state-abc',
      session,
      sessionID: 'sid-1',
    };
    const res = { redirect: vi.fn() };
    await make().controller.callback(req as never, res as never);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/auth/login'));
    expect(session.loginRetry).toBe(1);
    expect(session.authUser).toBeUndefined();
  });

  it('gives up with a 401 rather than looping once the retry budget is spent', async () => {
    vi.mocked(authorizationCodeGrant).mockRejectedValueOnce(timestampError());
    // A previous callback already consumed the single restart.
    const session: Record<string, unknown> = { ...pendingSession(), loginRetry: 1 };
    const req = {
      originalUrl: '/auth/callback?code=c&state=state-abc',
      session,
      sessionID: 'sid-1',
    };
    const res = { redirect: vi.fn() };

    await expect(make().controller.callback(req as never, res as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // No redirect at all — the loop is what we are preventing.
    expect(res.redirect).not.toHaveBeenCalled();
    // Budget cleared so a later, genuinely-fresh attempt is not pre-poisoned.
    expect(session.loginRetry).toBeUndefined();
  });

  it('does NOT restart on a genuine exchange failure (invalid_grant surfaces)', async () => {
    vi.mocked(authorizationCodeGrant).mockRejectedValueOnce(
      Object.assign(new Error('invalid_grant'), { code: 'OAUTH_RESPONSE_BODY_ERROR' }),
    );
    const session = pendingSession();
    const req = {
      originalUrl: '/auth/callback?code=c&state=state-abc',
      session,
      sessionID: 'sid-1',
    };
    const res = { redirect: vi.fn() };

    await expect(make().controller.callback(req as never, res as never)).rejects.toThrow(
      'invalid_grant',
    );
    expect(res.redirect).not.toHaveBeenCalled();
    expect(session.loginRetry).toBeUndefined();
  });

  it('clears the retry budget once a login completes', async () => {
    const session: Record<string, unknown> = { ...pendingSession(), loginRetry: 1 };
    const req = {
      originalUrl: '/auth/callback?code=c&state=state-abc',
      session,
      sessionID: 'sid-1',
    };
    const res = { redirect: vi.fn() };
    await make().controller.callback(req as never, res as never);

    expect(session.loginRetry).toBeUndefined();
    expect((session.authUser as AuthUser).id).toBe('user-1');
  });

  it('preserves the external /login path when a reverse proxy prefix is in play', async () => {
    const proxied: AuthModuleOptions = {
      ...options,
      redirectUri: 'https://app.example.gov/api/auth/callback',
    };
    const session: Record<string, unknown> = {};
    const req = { originalUrl: '/auth/callback?code=c&state=x', session, sessionID: 'sid-1' };
    const res = { redirect: vi.fn() };
    await make(proxied).controller.callback(req as never, res as never);

    expect(res.redirect).toHaveBeenCalledWith('https://app.example.gov/api/auth/login');
  });

  it('falls back to postLoginRedirect when no returnTo was stored', async () => {
    const session: Record<string, unknown> = {
      oidcTx: { state: 'state-abc', nonce: 'nonce-def', codeVerifier: 'verifier-xyz' },
    };
    const req = {
      originalUrl: '/auth/callback?code=c&state=state-abc',
      session,
      sessionID: 'sid-1',
    };
    const res = { redirect: vi.fn() };
    await make().controller.callback(req as never, res as never);

    expect(res.redirect).toHaveBeenCalledWith(options.postLoginRedirect);
  });
});

describe('AuthController.me', () => {
  it('returns the session user', () => {
    const user: AuthUser = { id: 'u', roles: [], claims: { sub: 'u' } };
    expect(make().controller.me({ session: { authUser: user } } as never)).toBe(user);
  });

  it('throws 401 when there is no session user', () => {
    expect(() => make().controller.me({ session: {} } as never)).toThrow(UnauthorizedException);
  });
});

describe('AuthController.logout', () => {
  it('destroys the session, clears the cookie, and 204s by default', async () => {
    const destroy = vi.fn((cb: (err?: unknown) => void) => cb());
    const res = {
      clearCookie: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      redirect: vi.fn(),
    };
    const { controller, registry } = make();
    await controller.logout({ session: { destroy } } as never, res as never);

    expect(destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(registry.revokeAll).not.toHaveBeenCalled();
  });

  it('revokes all of the user’s sessions when ?everywhere=true', async () => {
    const destroy = vi.fn((cb: (err?: unknown) => void) => cb());
    const session = { authUser: { id: 'user-1', roles: [], claims: { sub: 'user-1' } }, destroy };
    const res = {
      clearCookie: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      redirect: vi.fn(),
    };
    const { controller, registry } = make();
    await controller.logout({ session } as never, res as never, 'true');

    expect(registry.revokeAll).toHaveBeenCalledWith('user-1');
    expect(destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('redirects through the IdP end_session_endpoint when rpLogout is enabled', async () => {
    const destroy = vi.fn((cb: (err?: unknown) => void) => cb());
    const session = { idToken: 'id-token-1', destroy };
    const res = {
      clearCookie: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      redirect: vi.fn(),
    };
    const { controller } = make({
      ...options,
      rpLogout: true,
      postLogoutRedirect: 'http://localhost:3000/',
    });
    await controller.logout({ session } as never, res as never);

    expect(destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();
    const target = res.redirect.mock.calls[0]?.[0] as string;
    expect(target).toContain('idp.example.com/logout');
    expect(target).toContain('id_token_hint=id-token-1');
    expect(target).toContain('post_logout_redirect_uri=');
    expect(res.status).not.toHaveBeenCalled();
  });
});
