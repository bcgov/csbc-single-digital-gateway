import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import {
  OIDC_PROVIDER_REGISTRY,
  type OidcProviderRegistry,
} from '../auth.config';
import { PUBLIC_ROUTE_KEY } from '../decorators/public-route.decorator';
import { AuthService } from '../services/auth.service';
import { IdpType } from '../types/idp';

interface JwksEntry {
  jwksClient: JwksClient;
  issuer: string;
  idpType: IdpType;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly jwksMap: Map<string, JwksEntry>;

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    @Inject(OIDC_PROVIDER_REGISTRY)
    private readonly registry: OidcProviderRegistry,
  ) {
    this.jwksMap = new Map();
    for (const [idpType, config] of this.registry) {
      const serverMeta = config.client.serverMetadata();
      const jwksUri = serverMeta.jwks_uri;

      if (jwksUri) {
        this.jwksMap.set(config.issuer, {
          issuer: config.issuer,
          idpType,
          jwksClient: new JwksClient({
            cache: true,
            jwksRequestsPerMinute: 5,
            jwksUri,
            rateLimit: true,
          }),
        });
      }
    }
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
    const requiredIdp = this.resolveRequiredIdp(request.path);

    // Session-based auth (BFF)
    if (this.authService.hasAnyActiveSession(request.session)) {
      if (!this.authService.hasActiveSession(requiredIdp, request.session)) {
        throw new UnauthorizedException(
          `${requiredIdp.toUpperCase()} authentication required`,
        );
      }
      if (this.authService.isTokenExpiringSoon(requiredIdp, request.session)) {
        const refreshed = await this.authService.refreshTokens(
          requiredIdp,
          request.session,
        );
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
        const { decoded, idpType } = await this.verifyJwt(token);

        if (idpType !== requiredIdp) {
          throw new UnauthorizedException(
            `${requiredIdp.toUpperCase()} authentication required`,
          );
        }

        (request as unknown as Record<string, unknown>)['user'] = decoded;
        return true;
      } catch (error) {
        if (error instanceof UnauthorizedException) throw error;
        this.logger.debug('JWT verification failed', (error as Error).message);
        throw new UnauthorizedException('Invalid token');
      }
    }

    throw new UnauthorizedException();
  }

  private resolveRequiredIdp(path: string): IdpType {
    if (path.startsWith('/admin') || path.startsWith('/auth/idir')) {
      return IdpType.IDIR;
    }
    return IdpType.BCSC;
  }

  private verifyJwt(
    token: string,
  ): Promise<{ decoded: unknown; idpType: IdpType }> {
    // Decode without verification to read issuer claim
    const unverified = jwt.decode(token, { complete: true });
    const issuer = (unverified?.payload as jwt.JwtPayload)?.iss;

    if (!issuer) {
      return Promise.reject(new Error('Token missing iss claim'));
    }

    const entry = this.jwksMap.get(issuer);
    if (!entry) {
      return Promise.reject(new Error(`Unknown token issuer: ${issuer}`));
    }

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          entry.jwksClient
            .getSigningKey(header.kid)
            .then((key) => callback(null, key.getPublicKey()))
            .catch((err: Error) => callback(err));
        },
        {
          algorithms: ['RS256'],
          issuer: entry.issuer,
        },
        (err, decoded) => {
          if (err) return reject(err);
          resolve({ decoded, idpType: entry.idpType });
        },
      );
    });
  }
}
