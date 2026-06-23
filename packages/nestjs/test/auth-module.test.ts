import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import {
  AUTH_OPTIONS,
  AUTH_USER_SYNC,
  AuthModule,
  OIDC_CONFIG,
  SESSION_REGISTRY,
  buildSessionOptions,
  noopSessionRegistry,
  passthroughUserSync,
} from '../src/auth';
import type { AuthUserSync, OidcClaims, SessionRegistry } from '../src/auth';

// A pre-built OIDC Configuration skips network discovery in unit tests.
const baseOptions = {
  issuer: 'https://idp.example.com',
  clientId: 'client',
  clientSecret: 'secret',
  redirectUri: 'http://localhost:4001/auth/callback',
  scopes: ['openid', 'profile', 'email'],
  postLoginRedirect: 'http://localhost:3000',
  session: { secret: 'sess-secret' },
  config: {} as never,
};

describe('buildSessionOptions', () => {
  it('hardens the cookie and disables resave/saveUninitialized', () => {
    const opts = buildSessionOptions({ secret: 's' });
    expect(opts.cookie?.httpOnly).toBe(true);
    expect(opts.cookie?.sameSite).toBe('lax');
    expect(opts.resave).toBe(false);
    expect(opts.saveUninitialized).toBe(false);
    expect(opts.secret).toBe('s');
  });

  it('passes a consumer-provided store through; defaults to none (MemoryStore)', () => {
    const store = {} as never;
    expect(buildSessionOptions({ secret: 's', store }).store).toBe(store);
    expect(buildSessionOptions({ secret: 's' }).store).toBeUndefined();
  });

  it('marks the cookie secure when requested', () => {
    expect(buildSessionOptions({ secret: 's', secure: true }).cookie?.secure).toBe(true);
    expect(buildSessionOptions({ secret: 's' }).cookie?.secure).toBe(false);
  });
});

describe('passthroughUserSync', () => {
  it('maps claims to an AuthUser with empty roles', async () => {
    const claims: OidcClaims = { sub: 'abc', email: 'a@b.com', name: 'A B' };
    const user = await passthroughUserSync.onSignIn(claims);
    expect(user.id).toBe('abc');
    expect(user.roles).toEqual([]);
    expect(user.claims).toBe(claims);
  });
});

describe('AuthModule', () => {
  it('forRoot provides options, OIDC config, and the passthrough sync by default', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule.forRoot(baseOptions)],
    }).compile();

    expect(moduleRef.get(AUTH_OPTIONS)).toMatchObject({ clientId: 'client' });
    expect(moduleRef.get(OIDC_CONFIG)).toBeDefined();
    const sync = moduleRef.get<AuthUserSync>(AUTH_USER_SYNC);
    expect(typeof sync.onSignIn).toBe('function');
    expect(moduleRef.get(SESSION_REGISTRY)).toBe(noopSessionRegistry);
  });

  it('forRootAsync lets a consumer override the session registry', async () => {
    const custom: SessionRegistry = {
      track: () => Promise.resolve(),
      revokeAll: () => Promise.resolve(),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRootAsync({
          useFactory: () => baseOptions,
          sessionRegistry: { provide: SESSION_REGISTRY, useValue: custom },
        }),
      ],
    }).compile();

    expect(moduleRef.get(SESSION_REGISTRY)).toBe(custom);
  });

  it('forRootAsync lets a consumer override the sync port', async () => {
    const custom: AuthUserSync = {
      onSignIn: (claims) => Promise.resolve({ id: 'x', roles: ['admin'], claims }),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRootAsync({
          useFactory: () => baseOptions,
          userSync: { provide: AUTH_USER_SYNC, useValue: custom },
        }),
      ],
    }).compile();

    const sync = moduleRef.get<AuthUserSync>(AUTH_USER_SYNC);
    const user = await sync.onSignIn({ sub: 's' });
    expect(user.roles).toEqual(['admin']);
  });
});
