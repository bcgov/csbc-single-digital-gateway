import { SetMetadata, createParamDecorator } from '@nestjs/common';
import type { CustomDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import './auth.session-data';
import type { AuthUser } from './auth.types';

/** Metadata key marking a route/controller as not requiring authentication. */
export const IS_PUBLIC_KEY = Symbol('auth:isPublic');
/** Metadata key carrying the roles required for a route/controller. */
export const ROLES_KEY = Symbol('auth:roles');
/** Metadata key marking a route/controller as exempt from the CSRF Origin check. */
export const SKIP_CSRF_KEY = Symbol('auth:skipCsrf');

/** Mark a route or controller as public (the global guard skips auth for it). */
export const Public = (): CustomDecorator<symbol> => SetMetadata(IS_PUBLIC_KEY, true);

/** Require the authenticated user to hold at least one of these roles. */
export const Roles = (...roles: string[]): CustomDecorator<symbol> => SetMetadata(ROLES_KEY, roles);

/**
 * Exempt a route or controller from the CSRF Origin check — for non-browser, server-to-server
 * callers (e.g. an IdP back-channel or webhook) that carry no browser `Origin`.
 */
export const SkipCsrf = (): CustomDecorator<symbol> => SetMetadata(SKIP_CSRF_KEY, true);

/** Factory behind {@link CurrentUser}: returns the AuthUser the guard attached to the request. */
export function currentUser(_data: unknown, ctx: ExecutionContext): AuthUser | undefined {
  return ctx.switchToHttp().getRequest<Request>().authUser;
}

/** Inject the authenticated `AuthUser` (undefined on a public route with no session). */
export const CurrentUser = createParamDecorator(currentUser);

/** Factory behind {@link AccessToken}: the session's current access token (refreshed by the guard). */
export function accessToken(_data: unknown, ctx: ExecutionContext): string | undefined {
  return ctx.switchToHttp().getRequest<Request>().session?.tokens?.accessToken;
}

/** Inject the current OIDC access token for a server-side downstream call (undefined if none). */
export const AccessToken = createParamDecorator(accessToken);
