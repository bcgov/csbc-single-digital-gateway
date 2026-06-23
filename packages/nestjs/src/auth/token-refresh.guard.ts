import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Configuration } from 'openid-client';

import { AUTH_OPTIONS, OIDC_CONFIG } from './auth.constants';
import { refreshTokens } from './auth.flow';
import './auth.session-data';
import type { AuthModuleOptions } from './auth.types';

const DEFAULT_SKEW_SECONDS = 30;

/**
 * Global guard (registered as APP_GUARD by AuthModule, after AuthGuard): lazily refreshes the
 * session's access token when it is within the skew window of expiry. Rotation-aware (delegates to
 * `refreshTokens`), and **fail-closed** — a refresh failure destroys the session and 401s, so the
 * BFF session can't outlive a revoked/expired IdP session. No-op when there is nothing to refresh.
 */
@Injectable()
export class TokenRefreshGuard implements CanActivate {
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
      request.session.tokens = await refreshTokens(this.config, tokens.refreshToken);
    } catch {
      // Fail closed: the refresh token is revoked/expired — destroy the session and force re-login.
      await new Promise<void>((resolve) => request.session.destroy(() => resolve()));
      throw new UnauthorizedException('session expired');
    }
    return true;
  }
}
