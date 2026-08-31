import {
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Configuration } from 'openid-client';

import { AUTH_OPTIONS, AUTH_USER_SYNC, OIDC_CONFIG, SESSION_REGISTRY } from './auth.constants';
import {
  buildLoginUrl,
  buildLogoutUrl,
  completeLogin,
  isRecoverableCallbackError,
  resolvePostLoginTarget,
  sanitizeReturnTo,
} from './auth.flow';
import './auth.session-data';
import type { SessionRegistry } from './session-registry';
import type { AuthModuleOptions, AuthUser, AuthUserSync } from './auth.types';

/**
 * BFF OIDC endpoints at the unversioned root. Tokens stay server-side; only an httpOnly
 * session cookie reaches the browser. (These become `@Public` once the guard lands in Wave 2.)
 */
/**
 * How many times the callback may auto-restart login for one session before giving up. One retry
 * clears the transient causes (stale/duplicate callback, an id_token that expired while the
 * authorization page sat open); anything that survives it is a real misconfiguration.
 */
const MAX_LOGIN_RESTARTS = 1;

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(OIDC_CONFIG) private readonly config: Configuration,
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
    @Inject(AUTH_USER_SYNC) private readonly userSync: AuthUserSync,
    @Inject(SESSION_REGISTRY) private readonly registry: SessionRegistry,
  ) {}

  @Get('login')
  async login(
    @Req() req: Request,
    @Res() res: Response,
    @Query('returnTo') returnTo?: string,
  ): Promise<void> {
    // Stash a *validated* return target (relative path only) so the callback can land the browser
    // back where it started. Unsafe/absent → nothing stored → default postLoginRedirect (unchanged).
    const safe = sanitizeReturnTo(returnTo);
    if (safe !== undefined) {
      req.session.returnTo = safe;
    }
    const url = await buildLoginUrl(this.config, this.options, req.session);
    res.redirect(url.href);
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Rebuild the callback URL from the *configured* redirectUri — path and all — carrying over only
    // the incoming query (`?code&state&iss…`). A reverse proxy may strip a path prefix before the BFF
    // sees the request (e.g. nginx maps `/api/auth/callback` -> `/auth/callback`), so req.originalUrl's
    // absolute path would clobber that prefix. openid-client derives the token-exchange `redirect_uri`
    // from this URL, and it MUST byte-match the one used at authorization (options.redirectUri) or the
    // IdP rejects the exchange with `invalid_grant` (Incorrect redirect_uri). Sourcing the path from
    // redirectUri keeps them identical and also avoids trusting the Host header.
    const currentUrl = new URL(this.options.redirectUri);
    currentUrl.search = new URL(req.originalUrl, this.options.redirectUri).search;

    let completed;
    try {
      completed = await completeLogin(this.config, currentUrl, req.session);
    } catch (error) {
      // A recoverable callback failure is not a server fault — restart the flow instead of 500ing.
      // The browser lands on a fresh `/auth/login`, which re-initiates PKCE/state and completes
      // cleanly; any `session.returnTo` survives, so the user still ends up where they started.
      // Covers a stale/duplicate/concurrently-clobbered callback (common against a shared IdP with
      // an active SSO session, which bounces the callback back near-instantly) and an id_token whose
      // `exp` had already passed. Genuine exchange failures (invalid_grant, bad claims) are not
      // recoverable and rethrow — surfaced, never silently retried.
      if (!isRecoverableCallbackError(error)) {
        throw error;
      }
      // Bounded: a cause a retry cannot fix (a badly skewed clock keeps minting id_tokens that look
      // expired on arrival) would otherwise bounce the browser between /login and /callback forever.
      // One restart, then a clean 401 the user can act on rather than an infinite redirect.
      const attempts = req.session.loginRetry ?? 0;
      if (attempts >= MAX_LOGIN_RESTARTS) {
        delete req.session.loginRetry;
        throw new UnauthorizedException(
          'Sign-in could not be completed. Please try again; if this persists, the server clock may be out of sync with the identity provider.',
        );
      }
      req.session.loginRetry = attempts + 1;
      // Derive the login URL from the *configured* redirectUri (proxy-safe, never the Host header):
      // its path ends in `.../auth/callback`, so swap the final segment for `login`.
      const loginUrl = new URL(this.options.redirectUri);
      loginUrl.pathname = loginUrl.pathname.replace(/\/callback$/, '/login');
      res.redirect(loginUrl.href);
      return;
    }
    const { claims, idToken, tokens } = completed;
    // A completed login clears the restart budget, so a later stale callback gets its own retry.
    delete req.session.loginRetry;
    const user = await this.userSync.onSignIn(claims);
    req.session.authUser = user;
    // Keep the id_token solely as the `id_token_hint` for RP-initiated logout.
    if (idToken !== undefined) {
      req.session.idToken = idToken;
    }
    // Store the token set server-side for lazy refresh + future downstream calls.
    req.session.tokens = tokens;
    // Index this session under the user so it can be revoked by "logout everywhere".
    await this.registry.track(user.id, req.sessionID);
    // Land the browser on the (single-use) return target if one was stored, else the default.
    // resolvePostLoginTarget pins any returnTo onto the app origin — no open-redirect surface.
    const target = resolvePostLoginTarget(req.session.returnTo, this.options.postLoginRedirect);
    delete req.session.returnTo;
    res.redirect(target);
  }

  @Get('me')
  me(@Req() req: Request): AuthUser {
    const user = req.session.authUser;
    if (user === undefined) {
      throw new UnauthorizedException();
    }
    return user;
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res() res: Response,
    @Query('everywhere') everywhere?: string,
  ): Promise<void> {
    const user = req.session.authUser;
    const idToken = req.session.idToken;

    // "Logout everywhere": revoke all of this user's other sessions before destroying this one.
    if (everywhere === 'true' && user !== undefined) {
      await this.registry.revokeAll(user.id);
    }

    // Always destroy the local session first, so logout is effective even if the IdP hop fails.
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    res.clearCookie('connect.sid');

    // Optionally bounce the browser through the IdP `end_session_endpoint` (RP-initiated logout).
    if (this.options.rpLogout === true) {
      const url = await buildLogoutUrl(this.config, {
        ...(idToken !== undefined && { idToken }),
        ...(this.options.postLogoutRedirect !== undefined && {
          postLogoutRedirect: this.options.postLogoutRedirect,
        }),
      });
      res.redirect(url.href);
      return;
    }

    res.status(204).send();
  }
}
