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
    Promise.resolve({ claims: () => ({ sub: 'user-1', email: 'u@e.com' }) }),
}));

import { AuthController } from '../src/auth/auth.controller';
import { passthroughUserSync } from '../src/auth/auth.user-sync';
import type { AuthUser } from '../src/auth/auth.types';

const options = {
  issuer: 'https://idp.example.com',
  clientId: 'client',
  clientSecret: 'secret',
  redirectUri: 'http://localhost:4001/auth/callback',
  scopes: ['openid', 'email'],
  postLoginRedirect: 'http://localhost:3000/app',
  session: { secret: 's' },
};
const make = () => new AuthController({} as never, options, passthroughUserSync);

describe('AuthController.login', () => {
  it('stores the OIDC transaction and 302s to the IdP', async () => {
    const session: Record<string, unknown> = {};
    const res = { redirect: vi.fn() };
    await make().login({ session } as never, res as never);

    expect(session.oidcTx).toMatchObject({ state: 'state-abc' });
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('idp.example.com/authorize'));
  });
});

describe('AuthController.callback', () => {
  it('exchanges the code, writes the session user, and 302s to postLoginRedirect', async () => {
    const session: Record<string, unknown> = {
      oidcTx: { state: 'state-abc', nonce: 'nonce-def', codeVerifier: 'verifier-xyz' },
    };
    const req = { originalUrl: '/auth/callback?code=c&state=state-abc', session };
    const res = { redirect: vi.fn() };
    await make().callback(req as never, res as never);

    expect((session.authUser as AuthUser).id).toBe('user-1');
    expect(res.redirect).toHaveBeenCalledWith(options.postLoginRedirect);
  });
});

describe('AuthController.me', () => {
  it('returns the session user', () => {
    const user: AuthUser = { id: 'u', roles: [], claims: { sub: 'u' } };
    expect(make().me({ session: { authUser: user } } as never)).toBe(user);
  });

  it('throws 401 when there is no session user', () => {
    expect(() => make().me({ session: {} } as never)).toThrow(UnauthorizedException);
  });
});

describe('AuthController.logout', () => {
  it('destroys the session, clears the cookie, and 204s', () => {
    const destroy = vi.fn((cb: (err?: unknown) => void) => cb());
    const res = { clearCookie: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() };
    make().logout({ session: { destroy } } as never, res as never);

    expect(destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
