import {
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockRegistry } from 'tests/utils/mock.auth.module';
import { OIDC_PROVIDER_REGISTRY } from '../auth.config';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from '../services/auth.service';
import { IdpType } from '../types/idp';

type JwtModuleMock = {
  decode: jest.Mock;
  verify: jest.Mock;
};

type SigningKey = { getPublicKey: () => string };

type JwksClientMock = {
  getSigningKey: jest.Mock<Promise<SigningKey>, [string]>;
};

type JwksModuleMock = {
  JwksClient: jest.Mock;
};

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

const getJwtMock = (): JwtModuleMock =>
  jest.requireMock('jsonwebtoken') as unknown as JwtModuleMock;

const getJwksMock = (): JwksModuleMock =>
  jest.requireMock('jwks-rsa') as unknown as JwksModuleMock;

const getConstructedJwksClients = (): JwksClientMock[] =>
  getJwksMock()
    .JwksClient.mock.results.map((result: { value: unknown }) => result.value)
    .filter(
      (value: unknown): value is JwksClientMock =>
        typeof value === 'object' && value !== null && 'getSigningKey' in value,
    );

function createMockExecutionContext(
  request: Record<string, unknown>,
): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
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

function jwtMockVerifyMockImplementation(
  jwtMock: JwtModuleMock,
  decodedPayload: { sub?: string },
  returnError?: string,
): void {
  jwtMock.verify.mockImplementation(
    (
      _token: string,
      getKey: (
        header: { kid: string },
        cb: (err: Error | null, key?: string) => void,
      ) => void,
      _options: unknown,
      done: (err: Error | null, decoded?: unknown) => void,
    ) => {
      if (returnError) {
        return done(new Error(returnError));
      }
      getKey({ kid: 'kid-1' }, (err, key) => {
        if (err) return done(err);
        if (!key) return done(new Error('Missing key'));
        return done(null, decodedPayload);
      });
    },
  );
}

describe('AuthGuard Unit Test', () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockServerMetadata = () => ({
      jwks_uri: 'https://idp.example.com/.well-known/jwks.json',
      issuer: 'https://idp.example.com',
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: OIDC_PROVIDER_REGISTRY,
          useFactory: () =>
            createMockRegistry(
              { serverMetadata: mockServerMetadata } as never,
              { serverMetadata: mockServerMetadata } as never,
            ),
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it('Should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('Session-based authentication', () => {
    it('Should allow public routes', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext({});
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
        path: '/api/resource',
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
        path: '/api/resource',
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
        path: '/api/resource',
      });
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Should throw when no auth is provided', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockAuthService.hasAnyActiveSession.mockReturnValue(false);
      const context = createMockExecutionContext({
        session: {},
        headers: {},
        path: '/api/resource',
      });
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

  describe('JWT bearer fallback', () => {
    it('Should allow valid bearer JWT and attach decoded user', async () => {
      const jwtMock = getJwtMock();

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockAuthService.hasAnyActiveSession.mockReturnValue(false);

      const request = {
        session: {},
        headers: { authorization: 'Bearer valid-token' },
        path: '/api/resource',
      };

      jwtMock.decode.mockReturnValue({
        payload: { iss: 'https://bcsc.example.com' },
      });

      for (const jwksClient of getConstructedJwksClients()) {
        jwksClient.getSigningKey.mockResolvedValue({
          getPublicKey: () => 'public-key',
        });
      }

      jwtMockVerifyMockImplementation(jwtMock, { sub: 'jwt-user-1' });

      const context = createMockExecutionContext(request);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((request as Record<string, unknown>).user).toEqual({
        sub: 'jwt-user-1',
      });
    });

    it('Should throw required IDP UnauthorizedException when bearer token IDP mismatches route', async () => {
      const jwtMock = getJwtMock();

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockAuthService.hasAnyActiveSession.mockReturnValue(false);

      const request = {
        session: {},
        headers: { authorization: 'Bearer valid-token' },
        path: '/admin/dashboard',
      };

      jwtMock.decode.mockReturnValue({
        payload: { iss: 'https://bcsc.example.com' },
      });

      for (const instance of getConstructedJwksClients()) {
        (instance.getSigningKey as jest.Mock).mockResolvedValue({
          getPublicKey: () => 'public-key',
        });
      }

      jwtMockVerifyMockImplementation(jwtMock, { sub: 'jwt-user-1' });

      const context = createMockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        'IDIR authentication required',
      );
    });

    it('Should log debug and throw Invalid token when bearer JWT verification fails with non-Unauthorized error', async () => {
      const jwtMock = getJwtMock();

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockAuthService.hasAnyActiveSession.mockReturnValue(false);

      const request = {
        session: {},
        headers: { authorization: 'Bearer bad-token' },
        path: '/api/resource',
      };

      const debugSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation(() => undefined);

      jwtMock.decode.mockReturnValue({ payload: {} });

      const context = createMockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow('Invalid token');
      expect(debugSpy).toHaveBeenCalledWith(
        'JWT verification failed',
        'Token missing iss claim',
      );

      debugSpy.mockRestore();
    });

    it('Should reject verifyJwt when token iss claim is missing', async () => {
      const jwtMock = getJwtMock();
      jwtMock.decode.mockReturnValue({ payload: {} });

      const verifyJwt = (
        guard as unknown as {
          verifyJwt: (token: string) => Promise<unknown>;
        }
      ).verifyJwt.bind(guard);

      await expect(verifyJwt('token-no-iss')).rejects.toThrow(
        'Token missing iss claim',
      );
    });

    it('Should reject verifyJwt when token issuer is unknown', async () => {
      const jwtMock = getJwtMock();
      jwtMock.decode.mockReturnValue({
        payload: { iss: 'https://unknown-issuer.example.com' },
      });

      const verifyJwt = (
        guard as unknown as {
          verifyJwt: (token: string) => Promise<unknown>;
        }
      ).verifyJwt.bind(guard);

      await expect(verifyJwt('token-unknown-issuer')).rejects.toThrow(
        'Unknown token issuer: https://unknown-issuer.example.com',
      );
    });

    it('Should resolve verifyJwt with decoded payload and idpType on successful JWKS verification', async () => {
      const jwtMock = getJwtMock();
      jwtMock.decode.mockReturnValue({
        payload: { iss: 'https://bcsc.example.com' },
      });

      for (const instance of getConstructedJwksClients()) {
        (instance.getSigningKey as jest.Mock).mockResolvedValue({
          getPublicKey: () => 'public-key',
        });
      }

      jwtMockVerifyMockImplementation(jwtMock, { sub: 'decoded-sub' });

      const verifyJwt = (
        guard as unknown as {
          verifyJwt: (token: string) => Promise<{
            decoded: unknown;
            idpType: IdpType;
          }>;
        }
      ).verifyJwt.bind(guard);

      await expect(verifyJwt('valid-token')).resolves.toEqual({
        decoded: { sub: 'decoded-sub' },
        idpType: IdpType.BCSC,
      });
    });

    it('Should reject verifyJwt when jwksClient.getSigningKey fails', async () => {
      const jwtMock = getJwtMock();
      jwtMock.decode.mockReturnValue({
        payload: { iss: 'https://bcsc.example.com' },
      });

      for (const instance of getConstructedJwksClients()) {
        (instance.getSigningKey as jest.Mock).mockRejectedValue(
          new Error('JWKS lookup failed'),
        );
      }

      jwtMockVerifyMockImplementation(jwtMock, { sub: 'should-not-happen' });

      const verifyJwt = (
        guard as unknown as {
          verifyJwt: (token: string) => Promise<unknown>;
        }
      ).verifyJwt.bind(guard);

      await expect(verifyJwt('token')).rejects.toThrow('JWKS lookup failed');
    });

    it('Should reject verifyJwt when jwt.verify callback returns an error', async () => {
      const jwtMock = getJwtMock();
      jwtMock.decode.mockReturnValue({
        payload: { iss: 'https://bcsc.example.com' },
      });

      for (const instance of getConstructedJwksClients()) {
        (instance.getSigningKey as jest.Mock).mockResolvedValue({
          getPublicKey: () => 'public-key',
        });
      }

      const returnError = 'jwt signature invalid';
      jwtMockVerifyMockImplementation(jwtMock, {}, returnError);

      const verifyJwt = (
        guard as unknown as {
          verifyJwt: (token: string) => Promise<unknown>;
        }
      ).verifyJwt.bind(guard);

      await expect(verifyJwt('token')).rejects.toThrow(returnError);
    });
  });

  describe('Constructor', () => {
    it('Should create jwksMap entries for providers that expose jwks_uri', () => {
      const bcscServerMetadata = jest.fn(() => ({
        jwks_uri: 'https://bcsc.example.com/.well-known/jwks.json',
      }));
      const idirServerMetadata = jest.fn(() => ({
        jwks_uri: 'https://idir.example.com/.well-known/jwks.json',
      }));

      const registry = createMockRegistry(
        { serverMetadata: bcscServerMetadata } as never,
        { serverMetadata: idirServerMetadata } as never,
      );

      const guardInstance = new AuthGuard(
        mockReflector as unknown as Reflector,
        mockAuthService as unknown as AuthService,
        registry,
      );

      const jwksCtor = getJwksMock().JwksClient;
      expect(jwksCtor).toHaveBeenCalledTimes(4);
      expect(jwksCtor).toHaveBeenNthCalledWith(3, {
        cache: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://bcsc.example.com/.well-known/jwks.json',
        rateLimit: true,
      });
      expect(jwksCtor).toHaveBeenNthCalledWith(4, {
        cache: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://idir.example.com/.well-known/jwks.json',
        rateLimit: true,
      });

      expect(bcscServerMetadata).toHaveBeenCalledTimes(1);
      expect(idirServerMetadata).toHaveBeenCalledTimes(1);

      const internal = guardInstance as unknown as {
        jwksMap: Map<
          string,
          { issuer: string; idpType: IdpType; jwksClient: unknown }
        >;
      };

      expect(internal.jwksMap.size).toBe(2);
      expect(internal.jwksMap.get('https://bcsc.example.com')).toEqual(
        expect.objectContaining({
          issuer: 'https://bcsc.example.com',
          idpType: IdpType.BCSC,
        }),
      );
      expect(internal.jwksMap.get('https://idir.example.com')).toEqual(
        expect.objectContaining({
          issuer: 'https://idir.example.com',
          idpType: IdpType.IDIR,
        }),
      );
    });

    it('Should skip providers with missing jwks_uri', () => {
      const noJwksServerMetadata = jest.fn(() => ({}));
      const validServerMetadata = jest.fn(() => ({
        jwks_uri: 'https://idir.example.com/.well-known/jwks.json',
      }));

      const registry = createMockRegistry(
        { serverMetadata: noJwksServerMetadata } as never,
        { serverMetadata: validServerMetadata } as never,
      );

      const guardInstance = new AuthGuard(
        mockReflector as unknown as Reflector,
        mockAuthService as unknown as AuthService,
        registry,
      );

      const jwksCtor = getJwksMock().JwksClient;
      expect(jwksCtor).toHaveBeenCalledTimes(3);
      expect(jwksCtor).toHaveBeenCalledWith({
        cache: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://idir.example.com/.well-known/jwks.json',
        rateLimit: true,
      });

      expect(noJwksServerMetadata).toHaveBeenCalledTimes(1);
      expect(validServerMetadata).toHaveBeenCalledTimes(1);

      const internal = guardInstance as unknown as {
        jwksMap: Map<string, { issuer: string; idpType: IdpType }>;
      };

      expect(internal.jwksMap.size).toBe(1);
      expect(internal.jwksMap.has('https://bcsc.example.com')).toBe(false);
      expect(internal.jwksMap.get('https://idir.example.com')).toEqual(
        expect.objectContaining({
          issuer: 'https://idir.example.com',
          idpType: IdpType.IDIR,
        }),
      );
    });
  });
});
