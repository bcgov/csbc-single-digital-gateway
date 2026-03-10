import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

@Injectable()
export class TokenRefreshMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    if (
      req.session?.accessToken &&
      this.authService.isTokenExpiringSoon(req.session)
    ) {
      await this.authService.refreshTokens(req.session);
    }
    next();
  }
}
