import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AUTH_OPTIONS } from './auth.constants';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators';
import './auth.session-data';
import type { AuthModuleOptions } from './auth.types';

// The package's own auth endpoints are always public — you can't authenticate to log in.
const INTRINSIC_PUBLIC_PREFIXES = ['/auth'];

/**
 * Global guard (registered as APP_GUARD by AuthModule): protected-by-default. Attaches the
 * session user to the request, allows `@Public`/public-prefix routes, 401s the unauthenticated,
 * and 403s when a route's `@Roles` (ANY-of) are unmet.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    // Attach the session user so @CurrentUser resolves on any handler (public routes included).
    if (request.session?.authUser !== undefined) {
      request.authUser = request.session.authUser;
    }

    if (this.isPublic(context, request.path)) {
      return true;
    }

    const user = request.authUser;
    if (user === undefined) {
      throw new UnauthorizedException();
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles !== undefined && requiredRoles.length > 0) {
      const allowed = requiredRoles.some((role) => user.roles.includes(role));
      if (!allowed) {
        throw new ForbiddenException();
      }
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

    const prefixes = [...INTRINSIC_PUBLIC_PREFIXES, ...(this.options.publicPaths ?? [])];
    return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  }
}
