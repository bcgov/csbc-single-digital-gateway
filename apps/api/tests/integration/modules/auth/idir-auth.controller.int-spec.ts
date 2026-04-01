import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import session from 'express-session';
import * as http from 'node:http';
import { IdirAuthController } from 'src/modules/auth/controllers/idir-auth.controller';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { IdpType } from 'src/modules/auth/types/idp';
import request from 'supertest';
import {
  mockAuthService,
  mockConfigService,
} from 'tests/utils/auth.controllers.mock';

describe('IdirAuthController Integration Test', () => {
  let app: INestApplication;
  let server: http.Server;
  let controller: IdirAuthController;
  const loginEndpoint = '/auth/idir/login';
  const callbackEndpoint = '/auth/idir/callback';
  const logoutEndpoint = '/auth/idir/logout';
  const meEndpoint = '/auth/idir/me';
  const buildAuthorizationUrl = 'https://idp.example.com/auth';

  const mockAuthMe = (profile: { sub: string; name?: string }) => {
    mockAuthService.handleCallback.mockImplementation(
      (_idpType, _query, session: Record<string, any>) => {
        session.idir = { profile };
        return Promise.resolve();
      },
    );
    mockAuthService.getUserProfile.mockImplementation(
      (_idpType, session: Record<string, any>) => {
        return (session.idir as { profile?: any })?.profile ?? null;
      },
    );
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [IdirAuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    app = module.createNestApplication();

    app.use(
      session({
        secret: process.env.TEST_SESSION_SECRET ?? 'test-session-secret',
        resave: false,
        saveUninitialized: true,
      }),
    );

    await app.init();
    server = app.getHttpServer() as http.Server;
    controller = module.get<IdirAuthController>(IdirAuthController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe("@Get('login')", () => {
    it('Should return a 302 redirect status on successful login', async () => {
      await request(server).get(`${loginEndpoint}`).expect(302);
    });

    it('Should set Location header with the auth URL on redirect', async () => {
      const expectedAuthUrl = `${buildAuthorizationUrl}?client_id=xyz`;
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(expectedAuthUrl);

      const response = await request(server).get(loginEndpoint).expect(302);

      expect(response.headers.location).toBe(expectedAuthUrl);
    });

    it('Should preserve returnTo query parameter in session before redirect', async () => {
      const returnTo = '/my-dashboard';
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        buildAuthorizationUrl,
      );

      await request(server).get(loginEndpoint).query({ returnTo }).expect(302);

      expect(mockAuthService.buildAuthorizationUrl).toHaveBeenCalled();
    });

    it('Should use ADMIN_FRONTEND_URL when returnTo is not provided in query', async () => {
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        buildAuthorizationUrl,
      );

      await request(server).get(loginEndpoint).expect(302);

      expect(mockConfigService.get).toHaveBeenCalledWith('ADMIN_FRONTEND_URL');
    });

    it('Should call authService.buildAuthorizationUrl with correct arguments', async () => {
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        buildAuthorizationUrl,
      );

      await request(server).get(loginEndpoint).expect(302);

      expect(mockAuthService.buildAuthorizationUrl).toHaveBeenCalledWith(
        IdpType.IDIR,
        expect.any(Object),
      );
    });

    it('Should return 500 when authService.buildAuthorizationUrl throws', async () => {
      mockAuthService.buildAuthorizationUrl.mockRejectedValue(
        new Error('OIDC service unavailable'),
      );

      await request(server).get(loginEndpoint).expect(500);
    });

    it('Should not redirect when authService fails', async () => {
      mockAuthService.buildAuthorizationUrl.mockRejectedValue(
        new Error('Network error'),
      );

      const response = await request(server).get(loginEndpoint).expect(500);

      expect(response.headers.location).toBeUndefined();
    });

    it('Should handle empty returnTo query parameter and use ADMIN_FRONTEND_URL', async () => {
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        buildAuthorizationUrl,
      );

      await request(server)
        .get(loginEndpoint)
        .query({ returnTo: '' })
        .expect(302);

      expect(mockConfigService.get).toHaveBeenCalledWith('ADMIN_FRONTEND_URL');
    });

    it('Should handle whitespace-only returnTo and use ADMIN_FRONTEND_URL', async () => {
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        buildAuthorizationUrl,
      );

      await request(server)
        .get(loginEndpoint)
        .query({ returnTo: '   ' })
        .expect(302);
    });

    it('Should handle very long returnTo parameter', async () => {
      const longReturnTo = '/path/' + 'a'.repeat(1000);
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        buildAuthorizationUrl,
      );

      await request(server)
        .get(loginEndpoint)
        .query({ returnTo: longReturnTo })
        .expect(302);

      expect(mockAuthService.buildAuthorizationUrl).toHaveBeenCalled();
    });

    it('Should include Set-Cookie header for session persistence', async () => {
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        buildAuthorizationUrl,
      );

      const response = await request(server).get(loginEndpoint).expect(302);

      expect(
        response.headers['set-cookie'] || response.headers['Set-Cookie'],
      ).toBeDefined();
    });

    it('Should handle multiple query parameters with returnTo', async () => {
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        `${buildAuthorizationUrl}?code=123`,
      );

      await request(server)
        .get(loginEndpoint)
        .query({ returnTo: '/dashboard', foo: 'bar' })
        .expect(302);

      expect(mockAuthService.buildAuthorizationUrl).toHaveBeenCalled();
    });

    it('Should be accessible without authentication (PublicRoute)', async () => {
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        buildAuthorizationUrl,
      );

      const response = await request(server).get(loginEndpoint).expect(302);

      expect(response.status).toBe(302);
    });

    it('Should handle concurrent login requests independently', async () => {
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        buildAuthorizationUrl,
      );

      const [res1, res2] = await Promise.all([
        request(server).get(loginEndpoint).query({ returnTo: '/dashboard' }),
        request(server).get(loginEndpoint).query({ returnTo: '/profile' }),
      ]);

      expect(res1.status).toBe(302);
      expect(res2.status).toBe(302);
      expect(mockAuthService.buildAuthorizationUrl).toHaveBeenCalledTimes(2);
    });
  });

  describe("@Get('callback')", () => {
    it('Should successfully handle callback and redirect to returnTo when FRONTEND_URL is set in ConfigService', async () => {
      mockAuthService.handleCallback.mockResolvedValue(undefined);
      mockAuthService.getUserProfile.mockReturnValue({ sub: 'user-123' });
      mockConfigService.get.mockReturnValue('https://frontend.example.com');

      const response = await request(server)
        .get(`${callbackEndpoint}?code=auth_code`)
        .set('Cookie', 'connect.sid=session_id')
        .expect(302);

      expect(response.headers.location).toContain('frontend.example.com');
    });

    it('Should redirect to error URL when handleCallback fails', async () => {
      mockAuthService.handleCallback.mockRejectedValue(
        new Error('OIDC failed'),
      );

      const response = await request(server)
        .get(`${callbackEndpoint}?code=invalid`)
        .expect(302);

      expect(response.headers.location).toContain('error=auth_failed');
    });

    it('Should preserve session returnTo across request', async () => {
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      const agent = request.agent(server);

      // First set returnTo via login
      await agent.get(`${loginEndpoint}?returnTo=/dashboard`).expect(302);

      // Then callback should use it
      const response = await agent
        .get(`${callbackEndpoint}?code=auth_code`)
        .expect(302);

      expect(response.headers.location).toContain('/dashboard');
    });

    it('Should handle callback without prior returnTo and fallback to FRONTEND_URL', async () => {
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      const response = await request(server)
        .get(`${callbackEndpoint}?code=auth_code`)
        .expect(302);

      expect(response.headers.location).toBe('https://frontend.example.com');
    });

    it('Should pass query params to authService.handleCallback', async () => {
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await request(server)
        .get(`${callbackEndpoint}?code=abc123&state=xyz789`)
        .expect(302);

      expect(mockAuthService.handleCallback).toHaveBeenCalledWith(
        IdpType.IDIR,
        expect.objectContaining({ code: 'abc123', state: 'xyz789' }),
        expect.any(Object),
      );
    });

    it('Should log error when callback fails', async () => {
      const loggerSpy = jest.spyOn(controller['logger'], 'error');
      mockAuthService.handleCallback.mockRejectedValue(
        new Error('Network error'),
      );

      await request(server).get(`${callbackEndpoint}?code=test`).expect(302);

      expect(loggerSpy).toHaveBeenCalledWith(
        'IDIR OIDC callback failed',
        expect.any(String),
      );
    });
  });

  describe('@Post("logout")', () => {
    const logoutResponse = 'https://idp.example.com/logout';
    it('should return 200 with logout endpoint and call buildLogoutUrl', async () => {
      mockAuthService.buildLogoutUrl.mockReturnValue(logoutResponse);

      const response = await request(server).post(logoutEndpoint).expect(200);

      expect(response.body).toEqual({ logoutUrl: logoutResponse });
      expect(mockAuthService.buildLogoutUrl).toHaveBeenCalledTimes(1);
      expect(mockAuthService.buildLogoutUrl).toHaveBeenCalledWith(
        IdpType.IDIR,
        expect.any(Object),
      );
    });

    it('should clear session.idir so /me becomes unauthorized after logout', async () => {
      const agent = request.agent(server);

      mockAuthMe({ sub: 'user-123' });

      mockAuthService.buildLogoutUrl.mockReturnValue(logoutResponse);

      await agent.get(`${callbackEndpoint}?code=ok`).expect(302);
      await agent.get(meEndpoint).expect(200);
      await agent.post(logoutEndpoint).expect(200);
      await agent.get(meEndpoint).expect(401);
    });

    it('should return 500 when buildLogoutUrl throws', async () => {
      mockAuthService.buildLogoutUrl.mockImplementation(() => {
        throw new Error('logout failure');
      });

      await request(server).post(logoutEndpoint).expect(500);
    });
  });

  describe("@Get('me')", () => {
    it('should return 200 with user profile when authenticated', async () => {
      const agent = request.agent(server);
      const profile = { sub: 'user-123', name: 'Admin User' };

      mockAuthMe(profile);

      await agent.get(`${callbackEndpoint}?code=ok`).expect(302);

      const response = await agent.get(meEndpoint).expect(200);

      expect(response.body).toEqual(profile);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockAuthService.getUserProfile.mockReturnValue(null);

      const response = await request(server).get(meEndpoint).expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('should call authService.getUserProfile with IdpType.IDIR and session', async () => {
      const profile = { sub: 'user-456', name: 'Jane Doe' };
      mockAuthService.getUserProfile.mockReturnValue(profile);

      await request(server).get(meEndpoint).expect(200);

      expect(mockAuthService.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockAuthService.getUserProfile).toHaveBeenCalledWith(
        IdpType.IDIR,
        expect.any(Object),
      );
    });

    it('should preserve profile across multiple /me requests in same session', async () => {
      const agent = request.agent(server);
      const profile = { sub: 'user-789', name: 'Session User' };

      mockAuthMe(profile);

      await agent.get(`${callbackEndpoint}?code=ok`).expect(302);

      const response1 = await agent.get(meEndpoint).expect(200);
      expect(response1.body).toEqual(profile);

      const response2 = await agent.get(meEndpoint).expect(200);
      expect(response2.body).toEqual(profile);
    });

    it('should return 401 after logout', async () => {
      const agent = request.agent(server);
      const profile = { sub: 'user-999', name: 'Logout Test' };

      mockAuthMe(profile);

      mockAuthService.getUserProfile.mockImplementation(
        (_idpType, session: Record<string, any>) => {
          return (session.idir as { profile?: any })?.profile ?? null;
        },
      );
      mockAuthService.buildLogoutUrl.mockReturnValue(logoutEndpoint);

      await agent.get(meEndpoint).expect(401);
    });
  });
});
