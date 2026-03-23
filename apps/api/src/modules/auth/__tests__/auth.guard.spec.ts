import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from '../services/auth.service';

jest.mock('jwks-rsa', () => ({
  JwksClient: jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn(),
  })),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockAuthService = {
  isTokenExpiringSoon: jest.fn(),
  refreshTokens: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      OIDC_ISSUER: 'https://idp.example.com',
    };
    return config[key];
  }),
};

function createMockExecutionContext(
  overrides: {
    session?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {},
): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        session: overrides.session ?? {},
        headers: overrides.headers ?? {},
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
        { provide: ConfigService, useValue: mockConfigService },
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

  it('Should allow session-based auth with valid token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(false);
    const context = createMockExecutionContext({
      session: { accessToken: 'valid-token' },
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('Should refresh expiring session token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(true);
    mockAuthService.refreshTokens.mockResolvedValue(true);
    const context = createMockExecutionContext({
      session: { accessToken: 'expiring-token' },
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockAuthService.refreshTokens).toHaveBeenCalled();
  });

  it('Should throw when session token refresh fails', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(true);
    mockAuthService.refreshTokens.mockResolvedValue(false);
    const context = createMockExecutionContext({
      session: { accessToken: 'expiring-token' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Should throw when no auth is provided', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockExecutionContext();
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
