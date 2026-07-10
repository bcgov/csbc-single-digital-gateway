import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from '../auth/auth.decorators';
import { M2M_AUTH_OPTIONS, M2M_TOKEN_VERIFIER } from './m2m-auth.constants';
import type { M2mAuthModuleOptions, M2mTokenVerifier } from './m2m-auth.types';

const BEARER_PREFIX = 'Bearer ';

/**
 * Global guard (registered as APP_GUARD by M2mAuthModule): protected-by-default for
 * machine-to-machine resource servers. Allows `@Public`/`publicPaths` routes; otherwise
 * requires a valid client-credentials bearer JWT (issuer + REQUIRED audience) and attaches
 * the verified {@link M2mPrincipal} to the request. All failures are a uniform 401 — the
 * cause goes to the debug log, never the response.
 */
@Injectable()
export class M2mAuthGuard implements CanActivate {
  private readonly logger = new Logger(M2mAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(M2M_AUTH_OPTIONS) private readonly options: M2mAuthModuleOptions,
    @Inject(M2M_TOKEN_VERIFIER) private readonly verifier: M2mTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (this.isPublic(context, request.path)) {
      return true;
    }

    const header = request.headers.authorization;
    const token =
      typeof header === 'string' && header.startsWith(BEARER_PREFIX)
        ? header.slice(BEARER_PREFIX.length)
        : undefined;
    if (token === undefined || token === '') {
      throw new UnauthorizedException();
    }

    try {
      request.m2mPrincipal = await this.verifier.verify(token);
    } catch (error) {
      this.logger.debug(
        `m2m token rejected: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new UnauthorizedException();
    }
    return true;
  }

  private isPublic(context: ExecutionContext, path: string): boolean {
    const byMetadata =
      this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    if (byMetadata) {
      return true;
    }
    const prefixes = this.options.publicPaths ?? [];
    return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  }
}
