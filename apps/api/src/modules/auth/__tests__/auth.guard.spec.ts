import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from '../services/auth.service';
import {
  OIDC_PROVIDER_REGISTRY,
  type OidcProviderConfig,
  type OidcProviderRegistry,
} from '../auth.config';
import { IdpType } from '../types/idp';

jest.mock('jwks-rsa', () => ({
  JwksClient: jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn(),
  })),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  decode: jest.fn(),
}));

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockAuthService = {
  isTokenExpiringSoon: jest.fn(),
  refreshTokens: jest.fn(),
  hasActiveSession: jest.fn(),
  hasAnyActiveSession: jest.fn(),
};

function createMockRegistry(): OidcProviderRegistry {
  const mockServerMetadata = () => ({
    jwks_uri: 'https://idp.example.com/.well-known/jwks.json',
    issuer: 'https://idp.example.com',
  });

  const registry: OidcProviderRegistry = new Map();
  registry.set(IdpType.BCSC, {
    client: { serverMetadata: mockServerMetadata } as unknown,
    issuer: 'https://bcsc.example.com',
    redirectUri: 'https://example.com/auth/bcsc/callback',
    postLogoutRedirectUri: 'https://example.com',
    scopes: 'openid profile email',
  } as OidcProviderConfig);
  registry.set(IdpType.IDIR, {
    client: { serverMetadata: mockServerMetadata } as unknown,
    issuer: 'https://idir.example.com',
    redirectUri: 'https://example.com/auth/idir/callback',
    postLogoutRedirectUri: 'https://example.com/admin',
    scopes: 'openid profile email',
  } as OidcProviderConfig);
  return registry;
}

function createMockExecutionContext(
  overrides: {
    session?: Record<string, unknown>;
    headers?: Record<string, string>;
    path?: string;
  } = {},
): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        session: overrides.session ?? {},
        headers: overrides.headers ?? {},
        path: overrides.path ?? '/api/resource',
      }),
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuthService, useValue: mockAuthService },
        { provide: OIDC_PROVIDER_REGISTRY, useFactory: createMockRegistry },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it('Should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('Should allow public routes', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockExecutionContext();
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('Should allow session-based auth with valid BCSC token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockAuthService.hasAnyActiveSession.mockReturnValue(true);
    mockAuthService.hasActiveSession.mockReturnValue(true);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(false);

    const context = createMockExecutionContext({
      session: { bcsc: { accessToken: 'valid-token' } },
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockAuthService.hasActiveSession).toHaveBeenCalledWith(
      IdpType.BCSC,
      expect.anything(),
    );
  });

  it('Should refresh expiring session token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockAuthService.hasAnyActiveSession.mockReturnValue(true);
    mockAuthService.hasActiveSession.mockReturnValue(true);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(true);
    mockAuthService.refreshTokens.mockResolvedValue(true);

    const context = createMockExecutionContext({
      session: { bcsc: { accessToken: 'expiring-token' } },
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
      IdpType.BCSC,
      expect.anything(),
    );
  });

  it('Should throw when session token refresh fails', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockAuthService.hasAnyActiveSession.mockReturnValue(true);
    mockAuthService.hasActiveSession.mockReturnValue(true);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(true);
    mockAuthService.refreshTokens.mockResolvedValue(false);

    const context = createMockExecutionContext({
      session: { bcsc: { accessToken: 'expiring-token' } },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Should throw when no auth is provided', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockAuthService.hasAnyActiveSession.mockReturnValue(false);
    const context = createMockExecutionContext();
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Should require IDIR for /admin paths', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockAuthService.hasAnyActiveSession.mockReturnValue(true);
    mockAuthService.hasActiveSession.mockReturnValue(true);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(false);

    const context = createMockExecutionContext({
      session: { idir: { accessToken: 'idir-token' } },
      path: '/admin/dashboard',
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockAuthService.hasActiveSession).toHaveBeenCalledWith(
      IdpType.IDIR,
      expect.anything(),
    );
  });

  it('Should throw when wrong IDP session for route', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockAuthService.hasAnyActiveSession.mockReturnValue(true);
    mockAuthService.hasActiveSession.mockReturnValue(false);

    const context = createMockExecutionContext({
      session: { bcsc: { accessToken: 'bcsc-token' } },
      path: '/admin/dashboard',
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
