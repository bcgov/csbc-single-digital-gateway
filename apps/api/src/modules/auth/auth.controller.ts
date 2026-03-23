import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { AuthService } from './auth.service';
import { PublicRoute } from './decorators/public-route.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfigDto, true>,
  ) {}

  @Get('login')
  @PublicRoute()
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    const returnTo =
      (req.query['returnTo'] as string) ||
      this.configService.get('FRONTEND_URL');

    req.session.returnTo = returnTo;

    const authUrl = await this.authService.buildAuthorizationUrl(req.session);

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: Error | undefined) =>
        err ? reject(err) : resolve(),
      );
    });

    res.redirect(authUrl);
  }

  @Get('callback')
  @PublicRoute()
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const callbackUrl = new URL(this.configService.get('OIDC_REDIRECT_URI'));
    const incomingUrl = new URL(req.originalUrl, callbackUrl.origin);
    callbackUrl.search = incomingUrl.search;

    try {
      await this.authService.handleCallback(callbackUrl, req.session);
    } catch (error) {
      this.logger.error('OIDC callback failed', (error as Error).message);
      res.redirect(
        `${this.configService.get('FRONTEND_URL')}?error=auth_failed`,
      );
      return;
    }

    const returnTo =
      req.session.returnTo ?? this.configService.get('FRONTEND_URL');
    delete req.session.returnTo;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: Error | undefined) =>
        err ? reject(err) : resolve(),
      );
    });

    res.redirect(returnTo as string);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const logoutUrl = this.authService.buildLogoutUrl(req.session);

    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err: Error | undefined) =>
        err ? reject(err) : resolve(),
      );
    });

    res.clearCookie('connect.sid');
    res.json({ logoutUrl });
  }

  @Get('me')
  me(@Req() req: Request) {
    const profile = this.authService.getUserProfile(req.session);

    if (!profile) {
      throw new UnauthorizedException();
    }

    return profile;
  }
}
