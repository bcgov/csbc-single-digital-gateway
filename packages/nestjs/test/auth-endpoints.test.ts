import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

vi.mock('openid-client', () => ({
  randomPKCECodeVerifier: () => 'verifier-xyz',
  calculatePKCECodeChallenge: () => Promise.resolve('challenge-xyz'),
  randomState: () => 'state-abc',
  randomNonce: () => 'nonce-def',
  buildAuthorizationUrl: (_config: unknown, params: Record<string, string>) =>
    new URL(`https://idp.example.com/authorize?${new URLSearchParams(params).toString()}`),
  authorizationCodeGrant: () =>
    Promise.resolve({
      claims: () => ({ sub: 'user-1', email: 'u@e.com' }),
      id_token: 'id-token-1',
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      expires_in: 300,
    }),
  buildEndSessionUrl: (_config: unknown, params: Record<string, string>) =>
    new URL(`https://idp.example.com/logout?${new URLSearchParams(params).toString()}`),
}));

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
