import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { IS_PUBLIC_KEY, ROLES_KEY } from '../src/auth/auth.decorators';
import { AuthGuard } from '../src/auth/auth.guard';
import type { AuthModuleOptions, AuthUser } from '../src/auth/auth.types';

const guardWith = (publicPaths?: string[]): AuthGuard =>
  new AuthGuard(new Reflector(), { publicPaths } as unknown as AuthModuleOptions);

interface CtxInit {
  path?: string;
  user?: AuthUser;
  isPublic?: boolean;
  roles?: string[];
}

function makeCtx(init: CtxInit): { ctx: ExecutionContext; request: { authUser?: AuthUser } } {
  // A fresh object per call is the metadata target (avoids cross-test metadata leakage).
  const handler: object = {};
  if (init.isPublic) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  if (init.roles) Reflect.defineMetadata(ROLES_KEY, init.roles, handler);
  const request: { path: string; session: { authUser?: AuthUser }; authUser?: AuthUser } = {
    path: init.path ?? '/orders',
    session: init.user ? { authUser: init.user } : {},
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => Object,
  } as unknown as ExecutionContext;
  return { ctx, request };
}

const admin: AuthUser = { id: 'a', roles: ['admin'], claims: { sub: 'a' } };
const plain: AuthUser = { id: 'u', roles: [], claims: { sub: 'u' } };

describe('AuthGuard', () => {
  it('401s an unauthenticated request to a protected route', () => {
    const { ctx } = makeCtx({});
    expect(() => guardWith().canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('allows an authenticated request and attaches request.authUser', () => {
    const { ctx, request } = makeCtx({ user: plain });
    expect(guardWith().canActivate(ctx)).toBe(true);
    expect(request.authUser).toBe(plain);
  });

  it('allows a @Public route with no session', () => {
    const { ctx } = makeCtx({ isPublic: true });
    expect(guardWith().canActivate(ctx)).toBe(true);
  });

  it('treats /auth as intrinsically public', () => {
    expect(guardWith().canActivate(makeCtx({ path: '/auth/login' }).ctx)).toBe(true);
  });

  it('honours consumer publicPaths (e.g. /health)', () => {
    expect(guardWith(['/health']).canActivate(makeCtx({ path: '/health/live' }).ctx)).toBe(true);
  });

  it('is path-boundary safe (/authother is NOT public)', () => {
    expect(() => guardWith().canActivate(makeCtx({ path: '/authother' }).ctx)).toThrow(
      UnauthorizedException,
    );
  });

  it('403s when the user lacks a required role', () => {
    const { ctx } = makeCtx({ user: plain, roles: ['admin'] });
    expect(() => guardWith().canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows when the user holds a required role (ANY-of)', () => {
    const { ctx } = makeCtx({ user: admin, roles: ['admin', 'editor'] });
    expect(guardWith().canActivate(ctx)).toBe(true);
  });
});
