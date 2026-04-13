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
import { RequireIdp } from 'src/common/decorators/idp.decorator';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { UsersService } from 'src/modules/users/services/users.service';
import { PublicRoute } from '../decorators/public-route.decorator';
import { AuthService } from '../services/auth.service';
import { IdpType } from '../types/idp';

@Controller('auth/idir')
@RequireIdp(IdpType.IDIR)
export class IdirAuthController {
  private readonly logger = new Logger(IdirAuthController.name);
  private readonly idpType = IdpType.IDIR;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfigDto, true>,
    private readonly usersService: UsersService,
  ) {}

  @Get('login')
  @PublicRoute()
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    const returnTo =
      (req.query['returnTo'] as string) ||
      this.configService.get('ADMIN_FRONTEND_URL');

    req.session.returnTo = returnTo;

    const authUrl = await this.authService.buildAuthorizationUrl(
      this.idpType,
      req.session,
    );

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
    try {
      await this.authService.handleCallback(
        this.idpType,
        req.query as Record<string, string>,
        req.session,
      );
    } catch (error) {
      this.logger.error('IDIR OIDC callback failed', (error as Error).message);
      res.redirect(
        `${this.configService.get('ADMIN_FRONTEND_URL')}?error=auth_failed`,
      );
      return;
    }

    const returnTo =
      req.session.returnTo ?? this.configService.get('ADMIN_FRONTEND_URL');
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
    const logoutUrl = this.authService.buildLogoutUrl(
      this.idpType,
      req.session,
    );

    delete req.session.idir;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: Error | undefined) =>
        err ? reject(err) : resolve(),
      );
    });

    res.json({ logoutUrl });
  }

  @Get('me')
  async me(@Req() req: Request) {
    const profile = this.authService.getUserProfile(this.idpType, req.session);

    if (!profile) {
      throw new UnauthorizedException();
    }

    const userId = req.session.idir?.userId;
    const roles = userId ? await this.usersService.getUserRoles(userId) : [];

    return { ...profile, roles };
  }
}
