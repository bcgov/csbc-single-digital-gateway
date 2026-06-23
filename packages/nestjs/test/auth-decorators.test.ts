import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import {
  CurrentUser,
  IS_PUBLIC_KEY,
  Public,
  ROLES_KEY,
  Roles,
  currentUser,
} from '../src/auth/auth.decorators';
import type { AuthUser } from '../src/auth/auth.types';

class Example {
  @Public()
  publicHandler(): void {}

  @Roles('admin', 'editor')
  rolesHandler(): void {}
}

describe('@Public / @Roles metadata', () => {
  const reflector = new Reflector();

  it('@Public sets IS_PUBLIC_KEY to true', () => {
    expect(reflector.get(IS_PUBLIC_KEY, Example.prototype.publicHandler)).toBe(true);
  });

  it('@Roles sets the required roles', () => {
    expect(reflector.get(ROLES_KEY, Example.prototype.rolesHandler)).toEqual(['admin', 'editor']);
  });

  it('unannotated handlers have no metadata', () => {
    expect(reflector.get(IS_PUBLIC_KEY, Example.prototype.rolesHandler)).toBeUndefined();
  });
});

const ctxWith = (authUser?: AuthUser): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => ({ authUser }) }) }) as unknown as ExecutionContext;

describe('@CurrentUser', () => {
  it('returns request.authUser', () => {
    const user: AuthUser = { id: 'u', roles: [], claims: { sub: 'u' } };
    expect(currentUser(undefined, ctxWith(user))).toBe(user);
  });

  it('returns undefined when no user is attached', () => {
    expect(currentUser(undefined, ctxWith())).toBeUndefined();
  });

  it('is exposed as a param decorator factory', () => {
    expect(typeof CurrentUser).toBe('function');
  });
});
