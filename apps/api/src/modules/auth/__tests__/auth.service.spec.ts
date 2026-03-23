import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as client from 'openid-client';
import { AuthService } from '../services/auth.service';
import { OIDC_CLIENT } from '../auth.config';

jest.mock('openid-client');

const mockOidcClient = {} as client.Configuration;

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      OIDC_REDIRECT_URI: 'https://example.com/auth/callback',
      OIDC_POST_LOGOUT_REDIRECT_URI: 'https://example.com',
    };
    return config[key];
  }),
};

function createMockSession(overrides = {}) {
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
        { provide: OIDC_CLIENT, useValue: mockOidcClient },
        { provide: ConfigService, useValue: mockConfigService },
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
      const url = await service.buildAuthorizationUrl(session as never);

      expect(url).toBe('https://idp.example.com/authorize');
      expect(session.oidcState).toBe('mock-state');
      expect(session.oidcCodeVerifier).toBe('mock-code-verifier');
      expect(client.buildAuthorizationUrl).toHaveBeenCalledWith(
        mockOidcClient,
        expect.objectContaining({
          redirect_uri: 'https://example.com/auth/callback',
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
      const callbackUrl = new URL('https://example.com/auth/callback?code=abc');

      await service.handleCallback(callbackUrl, session as never);

      expect(client.authorizationCodeGrant).toHaveBeenCalledWith(
        mockOidcClient,
        callbackUrl,
        {
          pkceCodeVerifier: 'mock-code-verifier',
          expectedState: 'mock-state',
        },
      );
      expect(session.accessToken).toBe('mock-access-token');
      expect(session.refreshToken).toBe('mock-refresh-token');
      expect(session.idToken).toBe('mock-id-token');
      expect(session.userProfile).toEqual(
        expect.objectContaining({ sub: 'mock-sub' }),
      );
      expect(session.oidcState).toBeUndefined();
      expect(session.oidcCodeVerifier).toBeUndefined();
    });
  });

  describe('refreshTokens', () => {
    it('Should return false when no refresh token exists', async () => {
      const session = createMockSession();
      const result = await service.refreshTokens(session as never);
      expect(result).toBe(false);
    });

    it('Should refresh tokens and update session', async () => {
      const session = createMockSession({ refreshToken: 'old-refresh-token' });
      const result = await service.refreshTokens(session as never);

      expect(result).toBe(true);
      expect(session.accessToken).toBe('mock-refreshed-access-token');
      expect(session.refreshToken).toBe('mock-refreshed-refresh-token');
      expect(session.idToken).toBe('mock-refreshed-id-token');
    });

    it('Should return false when refresh fails', async () => {
      (client.refreshTokenGrant as jest.Mock).mockRejectedValueOnce(
        new Error('refresh failed'),
      );
      const session = createMockSession({ refreshToken: 'old-refresh-token' });
      const result = await service.refreshTokens(session as never);
      expect(result).toBe(false);
    });
  });

  describe('buildLogoutUrl', () => {
    it('Should return a logout URL with id_token_hint', () => {
      const session = createMockSession({ idToken: 'mock-id-token' });
      const url = service.buildLogoutUrl(session as never);

      expect(url).toBe('https://idp.example.com/logout');
      expect(client.buildEndSessionUrl).toHaveBeenCalledWith(
        mockOidcClient,
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
      const url = service.buildLogoutUrl(session as never);
      expect(url).toBeNull();
    });
  });

  describe('getUserProfile', () => {
    it('Should return the user profile from session', () => {
      const profile = { sub: 'user-1', name: 'Test User' };
      const session = createMockSession({ userProfile: profile });
      expect(service.getUserProfile(session as never)).toEqual(profile);
    });

    it('Should return null when no profile exists', () => {
      const session = createMockSession();
      expect(service.getUserProfile(session as never)).toBeNull();
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('Should return false when no tokenExpiresAt', () => {
      const session = createMockSession();
      expect(service.isTokenExpiringSoon(session as never)).toBe(false);
    });

    it('Should return true when token expires within threshold', () => {
      const session = createMockSession({
        tokenExpiresAt: Date.now() + 10_000,
      });
      expect(service.isTokenExpiringSoon(session as never)).toBe(true);
    });

    it('Should return false when token is not expiring soon', () => {
      const session = createMockSession({
        tokenExpiresAt: Date.now() + 60_000,
      });
      expect(service.isTokenExpiringSoon(session as never)).toBe(false);
    });
  });
});
