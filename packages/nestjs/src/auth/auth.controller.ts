import { Controller, Get, Inject, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Configuration } from 'openid-client';

import { AUTH_OPTIONS, AUTH_USER_SYNC, OIDC_CONFIG } from './auth.constants';
import { buildLoginUrl, completeLogin } from './auth.flow';
import './auth.session-data';
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
    const claims = await completeLogin(this.config, currentUrl, req.session);
    req.session.authUser = await this.userSync.onSignIn(claims);
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
  logout(@Req() req: Request, @Res() res: Response): void {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.status(204).send();
    });
  }
}
