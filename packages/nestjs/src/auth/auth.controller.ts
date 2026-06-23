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
import { buildLoginUrl, buildLogoutUrl, completeLogin } from './auth.flow';
import './auth.session-data';
import type { SessionRegistry } from './session-registry';
import type { AuthModuleOptions, AuthUser, AuthUserSync } from './auth.types';

/**
 * BFF OIDC endpoints at the unversioned root. Tokens stay server-side; only an httpOnly
 * session cookie reaches the browser. (These become `@Public` once the guard lands in Wave 2.)
 */
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(OIDC_CONFIG) private readonly config: Configuration,
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
    @Inject(AUTH_USER_SYNC) private readonly userSync: AuthUserSync,
    @Inject(SESSION_REGISTRY) private readonly registry: SessionRegistry,
  ) {}

  @Get('login')
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    const url = await buildLoginUrl(this.config, this.options, req.session);
    res.redirect(url.href);
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Resolve the full callback URL from the configured redirect origin (avoids trusting the
    // Host header). originalUrl carries `?code&state`.
    const currentUrl = new URL(req.originalUrl, this.options.redirectUri);
    const { claims, idToken } = await completeLogin(this.config, currentUrl, req.session);
    const user = await this.userSync.onSignIn(claims);
    req.session.authUser = user;
    // Keep the id_token solely as the `id_token_hint` for RP-initiated logout.
    if (idToken !== undefined) {
      req.session.idToken = idToken;
    }
    // Index this session under the user so it can be revoked by "logout everywhere".
    await this.registry.track(user.id, req.sessionID);
    res.redirect(this.options.postLoginRedirect);
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
