import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { AuthService } from '../auth.service';
import { PUBLIC_ROUTE_KEY } from '../decorators/public-route.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly jwksClient: JwksClient;
  private readonly issuer: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfigDto, true>,
  ) {
    this.issuer = this.configService.get('OIDC_ISSUER');
    this.jwksClient = new JwksClient({
      cache: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `${this.issuer}/protocol/openid-connect/certs`,
      rateLimit: true,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublicRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Session-based auth (BFF)
    if (request.session?.accessToken) {
      if (this.authService.isTokenExpiringSoon(request.session)) {
        const refreshed = await this.authService.refreshTokens(request.session);
        if (!refreshed) {
          throw new UnauthorizedException('Session expired');
        }
      }
      return true;
    }

    // JWT Bearer fallback (Postman / machine-to-machine)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = await this.verifyJwt(token);
        (request as unknown as Record<string, unknown>)['user'] = decoded;
        return true;
      } catch (error) {
        this.logger.debug('JWT verification failed', (error as Error).message);
        throw new UnauthorizedException('Invalid token');
      }
    }

    throw new UnauthorizedException();
  }

  private verifyJwt(token: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          this.jwksClient
            .getSigningKey(header.kid)
            .then((key) => callback(null, key.getPublicKey()))
            .catch((err: Error) => callback(err));
        },
        {
          algorithms: ['RS256'],
          audience: ['account'],
          issuer: this.issuer,
        },
        (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded);
        },
      );
    });
  }
}
