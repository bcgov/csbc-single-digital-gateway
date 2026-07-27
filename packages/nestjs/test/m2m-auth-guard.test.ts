import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { IS_PUBLIC_KEY } from '../src/auth/auth.decorators';
import { M2mAuthGuard } from '../src/m2m-auth/m2m-auth.guard';
import type { M2mPrincipal, M2mTokenVerifier } from '../src/m2m-auth/m2m-auth.types';

const PRINCIPAL: M2mPrincipal = {
  clientId: 'platform-api-m2m',
  subject: 'service-account-platform-api-m2m',
  claims: { azp: 'platform-api-m2m' },
};

const acceptingVerifier: M2mTokenVerifier = {
  verify: vi.fn(async (token: string) => {
    if (token === 'good-token') {
      return PRINCIPAL;
    }
    throw new Error('invalid token');
  }),
};

interface RequestStub {
  path: string;
  headers: Record<string, string | undefined>;
  m2mPrincipal?: M2mPrincipal;
}

function contextFor(
  request: RequestStub,
  metadata: Record<symbol, unknown> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => 'handler',
    getClass: () => 'class',
    __metadata: metadata,
  } as unknown as ExecutionContext;
}

function reflectorWith(metadata: Record<symbol, unknown>): Reflector {
  return {
    getAllAndOverride: (key: symbol) => metadata[key],
  } as unknown as Reflector;
}

function guardWith(
  verifier: M2mTokenVerifier,
  options: { publicPaths?: string[] } = {},
  metadata: Record<symbol, unknown> = {},
): M2mAuthGuard {
  return new M2mAuthGuard(
    reflectorWith(metadata),
    { issuer: 'http://idp', audience: 'notification-service', ...options },
    verifier,
  );
}

describe('M2mAuthGuard', () => {
  it('allows an @Public route without a token', async () => {
    const guard = guardWith(acceptingVerifier, {}, { [IS_PUBLIC_KEY]: true });
    const request: RequestStub = { path: '/v1/anything', headers: {} };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
  });

  it('allows publicPaths prefixes, boundary-safe', async () => {
    const guard = guardWith(acceptingVerifier, { publicPaths: ['/health'] });
    await expect(
      guard.canActivate(contextFor({ path: '/health/live', headers: {} })),
    ).resolves.toBe(true);
    await expect(guard.canActivate(contextFor({ path: '/health', headers: {} }))).resolves.toBe(
      true,
    );
    await expect(
      guard.canActivate(contextFor({ path: '/healthother', headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('401s when the Authorization header is missing', async () => {
    const guard = guardWith(acceptingVerifier);
    await expect(
      guard.canActivate(contextFor({ path: '/v1/notifications', headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('401s on a malformed Authorization header (not Bearer)', async () => {
    const guard = guardWith(acceptingVerifier);
    await expect(
      guard.canActivate(
        contextFor({ path: '/v1/notifications', headers: { authorization: 'Basic abc' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('401s when the verifier rejects the token (uniform response, no cause leaked)', async () => {
    const guard = guardWith(acceptingVerifier);
    const attempt = guard.canActivate(
      contextFor({ path: '/v1/notifications', headers: { authorization: 'Bearer bad-token' } }),
    );
    await expect(attempt).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(attempt).rejects.not.toThrow(/invalid token/);
  });

  it('attaches the verified principal and allows the request', async () => {
    const guard = guardWith(acceptingVerifier);
    const request: RequestStub = {
      path: '/v1/notifications',
      headers: { authorization: 'Bearer good-token' },
    };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.m2mPrincipal).toEqual(PRINCIPAL);
  });
});
