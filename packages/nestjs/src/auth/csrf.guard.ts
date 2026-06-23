import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AUTH_OPTIONS } from './auth.constants';
import { SKIP_CSRF_KEY } from './auth.decorators';
import type { AuthModuleOptions } from './auth.types';

// Safe (non-mutating) HTTP methods never change state, so they bypass the CSRF check.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Global CSRF guard (registered as APP_GUARD by AuthModule, before AuthGuard): defense-in-depth on
 * top of `SameSite=lax`. For mutating requests it requires the browser-set `Origin` (or the origin
 * parsed from `Referer`) to be on the configured allowlist — a cross-site attacker cannot forge
 * `Origin`, so its request is rejected even though the session cookie is attached.
 *
 * Inert when `allowedOrigins` is unset/empty (opt-in), so importing AuthModule is not a breaking
 * posture change; `@SkipCsrf()` exempts non-browser routes.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const allowlist = this.options.allowedOrigins ?? [];
    // Opt-in: with no allowlist configured the guard does nothing (SameSite=lax remains the baseline).
    if (allowlist.length === 0) {
      return true;
    }

    if (this.isExempt(context)) {
      return true;
    }

    const origin = this.requestOrigin(request);
    if (origin === undefined || !allowlist.includes(origin)) {
      throw new ForbiddenException('CSRF: origin not allowed');
    }
    return true;
  }

  private isExempt(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(SKIP_CSRF_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }

  /** The request's origin: the `Origin` header, else the origin parsed from `Referer`. */
  private requestOrigin(request: Request): string | undefined {
    const origin = request.headers.origin;
    if (typeof origin === 'string' && origin.length > 0) {
      return origin;
    }
    const referer = request.headers.referer;
    if (typeof referer === 'string' && referer.length > 0) {
      try {
        return new URL(referer).origin;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
