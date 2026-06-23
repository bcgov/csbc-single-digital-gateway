import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { SKIP_CSRF_KEY } from '../src/auth/auth.decorators';
import type { AuthModuleOptions } from '../src/auth/auth.types';
import { CsrfGuard } from '../src/auth/csrf.guard';

const options = (allowedOrigins?: string[]): AuthModuleOptions =>
  ({ allowedOrigins }) as unknown as AuthModuleOptions;

/** Build an ExecutionContext over a fake request, with optional @SkipCsrf metadata. */
const ctx = (
  req: { method: string; headers?: Record<string, string> },
  skip = false,
): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers: {}, ...req }) }),
    getHandler: () => (skip ? skipHandler : plainHandler),
    getClass: () => Object,
  }) as unknown as ExecutionContext;

function plainHandler(): void {}
function skipHandler(): void {}
const reflector = new Reflector();
Reflect.defineMetadata(SKIP_CSRF_KEY, true, skipHandler);

const guard = (allowedOrigins?: string[]): CsrfGuard =>
  new CsrfGuard(reflector, options(allowedOrigins));

describe('CsrfGuard', () => {
  const allow = ['https://app.sdg.gov'];

  it('always allows safe methods (GET/HEAD/OPTIONS) regardless of origin', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(guard(allow).canActivate(ctx({ method }))).toBe(true);
    }
  });

  it('is inert (allows) when no allowlist is configured', () => {
    expect(guard().canActivate(ctx({ method: 'POST' }))).toBe(true);
    expect(guard([]).canActivate(ctx({ method: 'POST' }))).toBe(true);
  });

  it('allows a mutating request from an allowlisted Origin', () => {
    const c = ctx({ method: 'POST', headers: { origin: 'https://app.sdg.gov' } });
    expect(guard(allow).canActivate(c)).toBe(true);
  });

  it('rejects a mutating request from a foreign Origin', () => {
    const c = ctx({ method: 'POST', headers: { origin: 'https://evil.com' } });
    expect(() => guard(allow).canActivate(c)).toThrow(ForbiddenException);
  });

  it('rejects a mutating request with no Origin or Referer (fail-closed)', () => {
    expect(() => guard(allow).canActivate(ctx({ method: 'POST' }))).toThrow(ForbiddenException);
  });

  it('falls back to the Referer origin when Origin is absent', () => {
    const ok = ctx({ method: 'DELETE', headers: { referer: 'https://app.sdg.gov/some/page' } });
    expect(guard(allow).canActivate(ok)).toBe(true);

    const bad = ctx({ method: 'DELETE', headers: { referer: 'https://evil.com/x' } });
    expect(() => guard(allow).canActivate(bad)).toThrow(ForbiddenException);
  });

  it('exempts routes marked @SkipCsrf even with a foreign origin', () => {
    const c = ctx({ method: 'POST', headers: { origin: 'https://evil.com' } }, true);
    expect(guard(allow).canActivate(c)).toBe(true);
  });
});
