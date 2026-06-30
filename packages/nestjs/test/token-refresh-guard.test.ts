import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// refreshTokens() dynamically imports openid-client; mock refreshTokenGrant.
vi.mock('openid-client', () => ({ refreshTokenGrant: vi.fn() }));
import { refreshTokenGrant } from 'openid-client';

import * as flow from '../src/auth/auth.flow';
import type { AuthModuleOptions, SessionTokens } from '../src/auth/auth.types';
import { TokenRefreshGuard } from '../src/auth/token-refresh.guard';

const mockRefresh = vi.mocked(refreshTokenGrant);

const ctx = (session: unknown, sessionID = 's1'): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ session, sessionID }) }),
  }) as unknown as ExecutionContext;

const guard = (options: Partial<AuthModuleOptions> = {}): TokenRefreshGuard =>
  new TokenRefreshGuard({} as never, options as AuthModuleOptions);

const near = (): number => Date.now() + 1_000; // within the 30s skew → refresh
const far = (): number => Date.now() + 600_000; // outside skew → no refresh

beforeEach(() => mockRefresh.mockReset());

describe('TokenRefreshGuard — no-op cases', () => {
  it('passes when there is no token set', async () => {
    expect(await guard().canActivate(ctx({}))).toBe(true);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('passes (no refresh) when there is no refresh token', async () => {
    const tokens: SessionTokens = { accessToken: 'a', expiresAt: near() };
    expect(await guard().canActivate(ctx({ tokens }))).toBe(true);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('passes (no refresh) when expiry is unknown', async () => {
    const tokens: SessionTokens = { accessToken: 'a', refreshToken: 'r' };
    expect(await guard().canActivate(ctx({ tokens }))).toBe(true);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('passes (no refresh) when the token is not near expiry', async () => {
    const tokens: SessionTokens = { accessToken: 'a', refreshToken: 'r', expiresAt: far() };
    expect(await guard().canActivate(ctx({ tokens }))).toBe(true);
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

describe('TokenRefreshGuard — refresh near expiry', () => {
  it('refreshes and persists the new token set when within the skew window', async () => {
    mockRefresh.mockResolvedValueOnce({
      access_token: 'new-at',
      refresh_token: 'new-rt',
      expires_in: 300,
    } as never);
    const session = { tokens: { accessToken: 'a', refreshToken: 'r', expiresAt: near() } };

    expect(await guard().canActivate(ctx(session))).toBe(true);
    expect(mockRefresh).toHaveBeenCalledWith(expect.anything(), 'r');
    expect(session.tokens.accessToken).toBe('new-at');
    expect(session.tokens.refreshToken).toBe('new-rt');
  });

  it('retains the current refresh token when the IdP rotates none (rotation-aware)', async () => {
    mockRefresh.mockResolvedValueOnce({ access_token: 'new-at', expires_in: 300 } as never);
    const session = { tokens: { accessToken: 'a', refreshToken: 'r', expiresAt: near() } };

    await guard().canActivate(ctx(session));
    expect(session.tokens.accessToken).toBe('new-at');
    expect(session.tokens.refreshToken).toBe('r');
  });

  it('respects a custom tokenRefreshSkewSeconds', async () => {
    // 10-minute token with a 15-minute skew → treated as near expiry.
    mockRefresh.mockResolvedValueOnce({ access_token: 'new-at', expires_in: 300 } as never);
    const session = { tokens: { accessToken: 'a', refreshToken: 'r', expiresAt: far() } };

    await guard({ tokenRefreshSkewSeconds: 900 }).canActivate(ctx(session));
    expect(mockRefresh).toHaveBeenCalledOnce();
  });
});

describe('TokenRefreshGuard — fail closed only on a revoked token', () => {
  it('destroys the session and throws 401 when the refresh token is invalid_grant', async () => {
    mockRefresh.mockRejectedValueOnce(new Error('invalid_grant'));
    const destroy = vi.fn((cb: (err?: unknown) => void) => cb());
    const session = {
      tokens: { accessToken: 'a', refreshToken: 'r', expiresAt: near() },
      destroy,
    };

    await expect(guard().canActivate(ctx(session))).rejects.toThrow(UnauthorizedException);
    expect(destroy).toHaveBeenCalled();
  });

  it('detects a structured OAuth invalid_grant error (openid-client shape)', async () => {
    mockRefresh.mockRejectedValueOnce(Object.assign(new Error('bad'), { error: 'invalid_grant' }));
    const destroy = vi.fn((cb: (err?: unknown) => void) => cb());
    const session = { tokens: { accessToken: 'a', refreshToken: 'r', expiresAt: near() }, destroy };

    await expect(guard().canActivate(ctx(session))).rejects.toThrow(UnauthorizedException);
    expect(destroy).toHaveBeenCalled();
  });

  it('does NOT destroy the session on a transient refresh error (network/IdP 5xx)', async () => {
    // The bug: a transient hiccup must not log the user out. Proceed with the session intact.
    mockRefresh.mockRejectedValueOnce(new Error('fetch failed: ECONNREFUSED'));
    const destroy = vi.fn((cb: (err?: unknown) => void) => cb());
    const session = { tokens: { accessToken: 'a', refreshToken: 'r', expiresAt: near() }, destroy };

    expect(await guard().canActivate(ctx(session))).toBe(true);
    expect(destroy).not.toHaveBeenCalled();
  });
});

describe('TokenRefreshGuard — concurrent coalescing', () => {
  // Spy at the refreshTokens boundary (what coalescedRefresh wraps) — deterministic, unlike the
  // refreshTokenGrant call count under concurrent dynamic imports.
  const freshSession = () => ({
    tokens: { accessToken: 'a', refreshToken: 'r', expiresAt: near() },
  });
  const newTokens: SessionTokens = { accessToken: 'new-at', refreshToken: 'r', expiresAt: far() };

  it('coalesces concurrent refreshes for one session into a single call', async () => {
    const spy = vi.spyOn(flow, 'refreshTokens').mockResolvedValue(newTokens);
    const g = guard();
    // Three concurrent requests on the same session id — only one refresh should run.
    const results = await Promise.all([
      g.canActivate(ctx(freshSession(), 'sess-1')),
      g.canActivate(ctx(freshSession(), 'sess-1')),
      g.canActivate(ctx(freshSession(), 'sess-1')),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('does not coalesce across different sessions', async () => {
    const spy = vi.spyOn(flow, 'refreshTokens').mockResolvedValue(newTokens);
    const g = guard();
    await Promise.all([
      g.canActivate(ctx(freshSession(), 'sess-A')),
      g.canActivate(ctx(freshSession(), 'sess-B')),
    ]);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
