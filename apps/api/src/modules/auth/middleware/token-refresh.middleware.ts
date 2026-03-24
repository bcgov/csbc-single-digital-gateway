import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { IdpType } from '../types/idp';

@Injectable()
export class TokenRefreshMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const refreshPromises = Object.values(IdpType)
      .filter(
        (idpType) =>
          this.authService.hasActiveSession(idpType, req.session) &&
          this.authService.isTokenExpiringSoon(idpType, req.session),
      )
      .map((idpType) => this.authService.refreshTokens(idpType, req.session));

    if (refreshPromises.length > 0) {
      await Promise.all(refreshPromises);
    }

    next();
  }
}
