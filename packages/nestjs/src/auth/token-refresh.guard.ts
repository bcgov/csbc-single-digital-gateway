import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Configuration } from 'openid-client';

import { AUTH_OPTIONS, OIDC_CONFIG } from './auth.constants';
import { refreshTokens } from './auth.flow';
import './auth.session-data';
import type { AuthModuleOptions, SessionTokens } from './auth.types';

const DEFAULT_SKEW_SECONDS = 30;

/**
 * A definitive "refresh token revoked/expired" OAuth error (RFC 6749 `invalid_grant`) — the only
 * condition that should log the user out. openid-client surfaces it as `error: 'invalid_grant'`;
 * we also match it loosely (code/cause/message) so a thrown `Error('invalid_grant')` is caught.
 */
function isInvalidGrant(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  const e = err as {
    error?: unknown;
    code?: unknown;
    message?: unknown;
    cause?: { error?: unknown };
  };
  return (
    e.error === 'invalid_grant' ||
    e.code === 'invalid_grant' ||
    e.cause?.error === 'invalid_grant' ||
    (typeof e.message === 'string' && e.message.includes('invalid_grant'))
  );
}

/**
 * Global guard (registered as APP_GUARD by AuthModule, after AuthGuard): lazily refreshes the
 * session's access token when it is within the skew window of expiry.
 *
 * Concurrency-hardened (bug 23-B1): the React apps fire bursts of concurrent credentialed requests
 * (e.g. refetch-on-focus), so a naive guard had every request in the skew window independently hit
 * the IdP (a thundering herd) and fail-close on **any** error — logging the user out on transient
 * blips or races. This guard now (1) **coalesces** concurrent refreshes per session into a single
 * IdP call, and (2) only fails closed on a genuine `invalid_grant` (revoked/expired refresh token).
 * Transient errors (network, IdP 5xx) leave the still-valid session intact — the BFF doesn't use the
 * access token itself, so a later request simply retries once the IdP recovers.
 */
@Injectable()
export class TokenRefreshGuard implements CanActivate {
  /** Per-session in-flight refresh, so concurrent requests share one IdP round-trip, not N. */
  private readonly inflight = new Map<string, Promise<SessionTokens>>();

  constructor(
    @Inject(OIDC_CONFIG) private readonly config: Configuration,
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tokens = request.session?.tokens;

    // Nothing to refresh: no token set, no refresh token, or no known expiry. Never couple the
    // session's lifetime to the short access-token TTL when we can't refresh.
    if (tokens?.refreshToken === undefined || tokens.expiresAt === undefined) {
      return true;
    }

    const skewMs = (this.options.tokenRefreshSkewSeconds ?? DEFAULT_SKEW_SECONDS) * 1000;
    if (tokens.expiresAt - Date.now() > skewMs) {
      return true; // not near expiry yet
    }

    try {
      request.session.tokens = await this.coalescedRefresh(request, tokens.refreshToken);
      return true;
    } catch (err) {
      if (isInvalidGrant(err)) {
        // The refresh token is genuinely revoked/expired — destroy the session and force re-login,
        // so the BFF session can't outlive a revoked IdP session.
        await new Promise<void>((resolve) => request.session.destroy(() => resolve()));
        throw new UnauthorizedException('session expired');
      }
      // Transient failure (network / IdP 5xx / concurrent-refresh race): do NOT log the user out.
      // Leave the session intact and let the request through; a later request retries the refresh.
      return true;
    }
  }

  /**
   * Coalesce concurrent refreshes for one session: the first request starts the IdP round-trip and
   * registers the promise; siblings within the window await the same result instead of stampeding
   * the IdP. The entry is cleared when the refresh settles (success or failure).
   */
  private coalescedRefresh(request: Request, refreshToken: string): Promise<SessionTokens> {
    const key = request.sessionID ?? refreshToken;
    const existing = this.inflight.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const promise = refreshTokens(this.config, refreshToken).finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }
}
