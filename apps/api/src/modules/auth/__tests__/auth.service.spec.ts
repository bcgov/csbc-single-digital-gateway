import { Test, TestingModule } from '@nestjs/testing';
import * as client from 'openid-client';
import { UsersService } from 'src/modules/users/services/users.service';
import { createMockRegistry } from 'tests/utils/auth.module.mock';
import {
  OIDC_PROVIDER_REGISTRY,
  type OidcProviderConfig,
} from '../auth.config';
import { AuthService } from '../services/auth.service';
import { IdpType } from '../types/idp';

const mockBcscClient = {} as client.Configuration;
const mockIdirClient = {} as client.Configuration;

const mockUsersService = {
  syncFromOidc: jest.fn().mockResolvedValue({ userId: 'user-1' }),
};

function createMockSession(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'test-session-id',
    cookie: {} as never,
    regenerate: jest.fn(),
    destroy: jest.fn(),
    reload: jest.fn(),
    resetMaxAge: jest.fn(),
    save: jest.fn(),
    touch: jest.fn(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: OIDC_PROVIDER_REGISTRY,
          useFactory: () => createMockRegistry(mockBcscClient, mockIdirClient),
        },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('Should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildAuthorizationUrl', () => {
    it('Should return an authorization URL', async () => {
      const session = createMockSession();
      const url = await service.buildAuthorizationUrl(
        IdpType.BCSC,
        session as never,
      );

      expect(url).toBe('https://idp.example.com/authorize');
      expect(session.oidcState).toBe('mock-state');
      expect(session.oidcCodeVerifier).toBe('mock-code-verifier');
      expect(session.oidcIdpType).toBe(IdpType.BCSC);
      expect(client.buildAuthorizationUrl).toHaveBeenCalledWith(
        mockBcscClient,
        expect.objectContaining({
          redirect_uri: 'https://example.com/auth/bcsc/callback',
          scope: 'openid profile email',
          code_challenge: 'mock-code-challenge',
          code_challenge_method: 'S256',
          state: 'mock-state',
        }),
      );
    });
  });

  describe('handleCallback', () => {
    it('Should exchange code for tokens and set session data', async () => {
      const session = createMockSession({
        oidcState: 'mock-state',
        oidcCodeVerifier: 'mock-code-verifier',
      });
      const callbackUrl = new URL(
        'https://example.com/auth/bcsc/callback?code=abc',
      );

      await service.handleCallback(IdpType.BCSC, callbackUrl, session as never);

      expect(client.authorizationCodeGrant).toHaveBeenCalledWith(
        mockBcscClient,
        callbackUrl,
        {
          pkceCodeVerifier: 'mock-code-verifier',
          expectedState: 'mock-state',
        },
      );
      expect(session.bcsc).toEqual(
        expect.objectContaining({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          idToken: 'mock-id-token',
          userId: 'user-1',
        }),
      );
      expect((session.bcsc as Record<string, unknown>).userProfile).toEqual(
        expect.objectContaining({ sub: 'mock-sub' }),
      );
      expect(session.oidcState).toBeUndefined();
      expect(session.oidcCodeVerifier).toBeUndefined();
      expect(session.oidcIdpType).toBeUndefined();
    });

    it('Should call usersService.syncFromOidc with correct args', async () => {
      const session = createMockSession({
        oidcState: 'mock-state',
        oidcCodeVerifier: 'mock-code-verifier',
      });
      const callbackUrl = new URL(
        'https://example.com/auth/bcsc/callback?code=abc',
      );

      await service.handleCallback(IdpType.BCSC, callbackUrl, session as never);

      expect(mockUsersService.syncFromOidc).toHaveBeenCalledWith(
        'https://bcsc.example.com',
        'mock-sub',
        expect.objectContaining({ sub: 'mock-sub' }),
        { name: undefined, email: undefined },
      );
    });

    it('Should map full claims into userProfile and use display_name/email for syncFromOidc', async () => {
      const callbackUrl = new URL(
        'https://example.com/auth/bcsc/callback?code=abc&state=mock-state',
      );
      const session = createMockSession({
        oidcState: 'mock-state',
        oidcCodeVerifier: 'mock-code-verifier',
      });

      const claims = {
        sub: 'sub-123',
        name: 'Legal Name',
        display_name: 'Display Name',
        email: 'person@example.com',
        given_name: 'Given',
        family_name: 'Family',
        picture: 'https://example.com/avatar.png',
      };

      (client.authorizationCodeGrant as jest.Mock).mockResolvedValueOnce({
        access_token: 'access-123',
        refresh_token: 'refresh-123',
        id_token: 'id-123',
        claims: jest.fn(() => claims),
        expiresIn: jest.fn(() => 120),
      });

      await service.handleCallback(IdpType.BCSC, callbackUrl, session as never);

      expect(mockUsersService.syncFromOidc).toHaveBeenCalledWith(
        'https://bcsc.example.com',
        'sub-123',
        claims,
        { name: 'Display Name', email: 'person@example.com' },
      );

      const bcsc = session.bcsc as Record<string, unknown>;
      expect(bcsc.accessToken).toBe('access-123');
      expect(bcsc.refreshToken).toBe('refresh-123');
      expect(bcsc.idToken).toBe('id-123');
      expect(bcsc.userProfile).toEqual({
        sub: 'sub-123',
        name: 'Legal Name',
        email: 'person@example.com',
        given_name: 'Given',
        family_name: 'Family',
        picture: 'https://example.com/avatar.png',
      });
      expect(typeof bcsc.tokenExpiresAt).toBe('number');
    });

    it('Should handle missing claims and undefined expiresIn with safe fallbacks', async () => {
      const callbackUrl = new URL(
        'https://example.com/auth/idir/callback?code=abc&state=mock-state',
      );
      const session = createMockSession({
        oidcState: 'mock-state',
        oidcCodeVerifier: 'mock-code-verifier',
      });

      (client.authorizationCodeGrant as jest.Mock).mockResolvedValueOnce({
        access_token: 'idir-access',
        refresh_token: 'idir-refresh',
        id_token: 'idir-id',
        claims: jest.fn(() => undefined),
        expiresIn: jest.fn(() => undefined),
      });

      await service.handleCallback(IdpType.IDIR, callbackUrl, session as never);

      expect(mockUsersService.syncFromOidc).toHaveBeenCalledWith(
        'https://idir.example.com',
        '',
        undefined,
        { name: undefined, email: undefined },
      );

      const idir = session.idir as Record<string, unknown>;
      expect(idir.accessToken).toBe('idir-access');
      expect(idir.refreshToken).toBe('idir-refresh');
      expect(idir.idToken).toBe('idir-id');
      expect(idir.tokenExpiresAt).toBeUndefined();
      expect(idir.userProfile).toEqual({
        sub: '',
        name: undefined,
        email: undefined,
        given_name: undefined,
        family_name: undefined,
        picture: undefined,
      });
    });
  });

  describe('refreshTokens', () => {
    it('Should return false when no refresh token exists', async () => {
      const session = createMockSession({ bcsc: {} });
      const result = await service.refreshTokens(
        IdpType.BCSC,
        session as never,
      );
      expect(result).toBe(false);
    });

    it('Should refresh tokens and update session', async () => {
      const session = createMockSession({
        bcsc: { refreshToken: 'old-refresh-token' },
      });
      const result = await service.refreshTokens(
        IdpType.BCSC,
        session as never,
      );

      const bcsc = session.bcsc as Record<string, unknown>;
      expect(result).toBe(true);
      expect(bcsc.accessToken).toBe('mock-refreshed-access-token');
      expect(bcsc.refreshToken).toBe('mock-refreshed-refresh-token');
      expect(bcsc.idToken).toBe('mock-refreshed-id-token');
    });

    it('Should return false when refresh fails', async () => {
      (client.refreshTokenGrant as jest.Mock).mockRejectedValueOnce(
        new Error('refresh failed'),
      );
      const session = createMockSession({
        bcsc: { refreshToken: 'old-refresh-token' },
      });
      const result = await service.refreshTokens(
        IdpType.BCSC,
        session as never,
      );
      expect(result).toBe(false);
    });

    it('Should compute tokenExpiresAt and update access/refresh/id tokens when present', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

      (client.refreshTokenGrant as jest.Mock).mockResolvedValueOnce({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        id_token: 'new-id-token',
        expiresIn: jest.fn(() => 120),
      });

      const session = createMockSession({
        bcsc: { refreshToken: 'old-refresh-token' },
      });

      const result = await service.refreshTokens(
        IdpType.BCSC,
        session as never,
      );

      const bcsc = session.bcsc as Record<string, unknown>;
      expect(result).toBe(true);
      expect(bcsc.accessToken).toBe('new-access-token');
      expect(bcsc.tokenExpiresAt).toBe(1_120_000);
      expect(bcsc.refreshToken).toBe('new-refresh-token');
      expect(bcsc.idToken).toBe('new-id-token');

      nowSpy.mockRestore();
    });

    it('Should set tokenExpiresAt undefined and keep existing refresh/id tokens when omitted', async () => {
      (client.refreshTokenGrant as jest.Mock).mockResolvedValueOnce({
        access_token: 'rotated-access-token',
        refresh_token: undefined,
        id_token: undefined,
        expiresIn: jest.fn(() => 0),
      });

      const session = createMockSession({
        bcsc: {
          refreshToken: 'existing-refresh-token',
          idToken: 'existing-id-token',
        },
      });

      const result = await service.refreshTokens(
        IdpType.BCSC,
        session as never,
      );

      const bcsc = session.bcsc as Record<string, unknown>;
      expect(result).toBe(true);
      expect(bcsc.accessToken).toBe('rotated-access-token');
      expect(bcsc.tokenExpiresAt).toBeUndefined();
      expect(bcsc.refreshToken).toBe('existing-refresh-token');
      expect(bcsc.idToken).toBe('existing-id-token');
    });
  });

  describe('buildLogoutUrl', () => {
    it('Should return a logout URL with id_token_hint', () => {
      const session = createMockSession({
        bcsc: { idToken: 'mock-id-token' },
      });
      const url = service.buildLogoutUrl(IdpType.BCSC, session as never);

      expect(url).toBe('https://idp.example.com/logout');
      expect(client.buildEndSessionUrl).toHaveBeenCalledWith(
        mockBcscClient,
        expect.objectContaining({
          post_logout_redirect_uri: 'https://example.com',
          id_token_hint: 'mock-id-token',
        }),
      );
    });

    it('Should return null when buildEndSessionUrl throws', () => {
      (client.buildEndSessionUrl as jest.Mock).mockImplementationOnce(() => {
        throw new Error('no end_session_endpoint');
      });
      const session = createMockSession();
      const url = service.buildLogoutUrl(IdpType.BCSC, session as never);
      expect(url).toBeNull();
    });
  });

  describe('getUserProfile', () => {
    it('Should return the user profile from session', () => {
      const profile = { sub: 'user-1', name: 'Test User' };
      const session = createMockSession({
        bcsc: { userProfile: profile },
      });
      expect(service.getUserProfile(IdpType.BCSC, session as never)).toEqual(
        profile,
      );
    });

    it('Should return null when no profile exists', () => {
      const session = createMockSession();
      expect(service.getUserProfile(IdpType.BCSC, session as never)).toBeNull();
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('Should return false when no tokenExpiresAt', () => {
      const session = createMockSession();
      expect(service.isTokenExpiringSoon(IdpType.BCSC, session as never)).toBe(
        false,
      );
    });

    it('Should return true when token expires within threshold', () => {
      const session = createMockSession({
        bcsc: { tokenExpiresAt: Date.now() + 10_000 },
      });
      expect(service.isTokenExpiringSoon(IdpType.BCSC, session as never)).toBe(
        true,
      );
    });

    it('Should return false when token is not expiring soon', () => {
      const session = createMockSession({
        bcsc: { tokenExpiresAt: Date.now() + 60_000 },
      });
      expect(service.isTokenExpiringSoon(IdpType.BCSC, session as never)).toBe(
        false,
      );
    });
  });

  describe('hasActiveSession', () => {
    it('Should return true when IDP session has access token', () => {
      const session = createMockSession({
        bcsc: { accessToken: 'some-token' },
      });
      expect(service.hasActiveSession(IdpType.BCSC, session as never)).toBe(
        true,
      );
    });

    it('Should return false when IDP session has no access token', () => {
      const session = createMockSession();
      expect(service.hasActiveSession(IdpType.BCSC, session as never)).toBe(
        false,
      );
    });
  });

  describe('hasAnyActiveSession', () => {
    it('Should return true when BCSC session is active', () => {
      const session = createMockSession({
        bcsc: { accessToken: 'token' },
      });
      expect(service.hasAnyActiveSession(session as never)).toBe(true);
    });

    it('Should return true when IDIR session is active', () => {
      const session = createMockSession({
        idir: { accessToken: 'token' },
      });
      expect(service.hasAnyActiveSession(session as never)).toBe(true);
    });

    it('Should return false when no session is active', () => {
      const session = createMockSession();
      expect(service.hasAnyActiveSession(session as never)).toBe(false);
    });
  });

  describe('getProvider', () => {
    const getProvider = (
      svc: AuthService,
    ): ((idpType: IdpType) => OidcProviderConfig) =>
      (
        svc as unknown as {
          getProvider: (idpType: IdpType) => OidcProviderConfig;
        }
      ).getProvider.bind(svc);

    it('Should return BCSC provider when idpType is BCSC', () => {
      const provider = getProvider(service)(IdpType.BCSC);

      expect(provider).toEqual({
        client: mockBcscClient,
        issuer: 'https://bcsc.example.com',
        redirectUri: 'https://example.com/auth/bcsc/callback',
        postLogoutRedirectUri: 'https://example.com',
        scopes: 'openid profile email',
      });
    });

    it('Should return IDIR provider when idpType is IDIR', () => {
      const provider = getProvider(service)(IdpType.IDIR);

      expect(provider).toEqual({
        client: mockIdirClient,
        issuer: 'https://idir.example.com',
        redirectUri: 'https://example.com/auth/idir/callback',
        postLogoutRedirectUri: 'https://example.com/admin',
        scopes: 'openid profile email',
      });
    });

    it('Should throw when idpType is unknown', () => {
      expect(() => getProvider(service)('unknown' as IdpType)).toThrow(
        'Unknown IDP type: unknown',
      );
    });
  });
});
