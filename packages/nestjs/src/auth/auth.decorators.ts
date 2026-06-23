import { SetMetadata, createParamDecorator } from '@nestjs/common';
import type { CustomDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import './auth.session-data';
import type { AuthUser } from './auth.types';

/** Metadata key marking a route/controller as not requiring authentication. */
export const IS_PUBLIC_KEY = Symbol('auth:isPublic');
/** Metadata key carrying the roles required for a route/controller. */
export const ROLES_KEY = Symbol('auth:roles');

/** Mark a route or controller as public (the global guard skips auth for it). */
export const Public = (): CustomDecorator<symbol> => SetMetadata(IS_PUBLIC_KEY, true);

/** Require the authenticated user to hold at least one of these roles. */
export const Roles = (...roles: string[]): CustomDecorator<symbol> => SetMetadata(ROLES_KEY, roles);

/** Factory behind {@link CurrentUser}: returns the AuthUser the guard attached to the request. */
export function currentUser(_data: unknown, ctx: ExecutionContext): AuthUser | undefined {
  return ctx.switchToHttp().getRequest<Request>().authUser;
}

/** Inject the authenticated `AuthUser` (undefined on a public route with no session). */
export const CurrentUser = createParamDecorator(currentUser);
