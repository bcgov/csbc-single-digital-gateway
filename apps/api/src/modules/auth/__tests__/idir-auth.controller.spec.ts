import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { IdirAuthController } from '../controllers/idir-auth.controller';
import { AuthService } from '../services/auth.service';
import { IdpType } from '../types/idp';

type MockSession = {
  save: jest.Mock;
  [key: string]: unknown;
};

type MockAuthService = {
  buildAuthorizationUrl: jest.Mock<Promise<string>, [IdpType, MockSession]>;
  handleCallback: jest.Mock<Promise<void>, [IdpType, URL, MockSession]>;
  buildLogoutUrl: jest.Mock<string, [IdpType, MockSession]>;
  getUserProfile: jest.Mock<unknown, [IdpType, MockSession]>;
};

describe('IdirAuthController', () => {
  let controller: IdirAuthController;

  const adminFrontendUrl = 'https://admin.example.com';

  const mockAuthService: MockAuthService = {
    buildAuthorizationUrl: jest.fn<Promise<string>, [IdpType, MockSession]>(),
    handleCallback: jest.fn<Promise<void>, [IdpType, URL, MockSession]>(),
    buildLogoutUrl: jest.fn<string, [IdpType, MockSession]>(),
    getUserProfile: jest.fn<unknown, [IdpType, MockSession]>(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const buildMockRequest = (
    overrides: Partial<{
      query: Record<string, string>;
      session: Record<string, unknown>;
      protocol: string;
      host: string;
      originalUrl: string;
    }> = {},
  ) =>
    ({
      query: overrides.query ?? {},
      session: {
        save: jest.fn((cb: (err?: Error) => void) => cb()),
        ...overrides.session,
      } as MockSession,
      protocol: overrides.protocol ?? 'https',
      get: jest.fn().mockReturnValue(overrides.host ?? 'api.example.com'),
      originalUrl: overrides.originalUrl ?? '/auth/idir/callback?code=abc',
    }) as unknown as Request & { session: MockSession };

  const buildMockResponse = () =>
    ({
      redirect: jest.fn(),
      json: jest.fn(),
    }) as unknown as Response & { redirect: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(adminFrontendUrl);

    controller = new IdirAuthController(
      mockAuthService as unknown as AuthService,
      mockConfigService as unknown as ConfigService<AppConfigDto, true>,
    );
  });

  describe('login', () => {
    it('Should validate that the method login is defined', () => {
      expect(controller).toHaveProperty('login');
    });

    it('Should use req.query.returnTo when present and set it on session', async () => {
      const req = buildMockRequest({ query: { returnTo: '/admin/dashboard' } });
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        'https://idp.example.com/auth',
      );

      await controller.login(req, res);

      expect(req.session.returnTo).toBe('/admin/dashboard');
    });

    it('Should fall back to ADMIN_FRONTEND_URL when req.query.returnTo is absent', async () => {
      const req = buildMockRequest({ query: {} });
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        'https://idp.example.com/auth',
      );

      await controller.login(req, res);

      expect(mockConfigService.get).toHaveBeenCalledWith('ADMIN_FRONTEND_URL');
      expect(req.session.returnTo).toBe(adminFrontendUrl);
    });

    it('Should call authService.buildAuthorizationUrl with IdpType.IDIR and session', async () => {
      const req = buildMockRequest();
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        'https://idp.example.com/auth',
      );

      await controller.login(req, res);

      expect(mockAuthService.buildAuthorizationUrl).toHaveBeenCalledTimes(1);
      expect(mockAuthService.buildAuthorizationUrl).toHaveBeenCalledWith(
        IdpType.IDIR,
        req.session,
      );
    });

    it('Should save session and then redirect to auth URL', async () => {
      const callOrder: string[] = [];
      const req = buildMockRequest();
      const res = buildMockResponse();

      req.session.save.mockImplementation((cb: (err?: Error) => void) => {
        callOrder.push('save');
        cb();
      });
      res.redirect.mockImplementation(() => {
        callOrder.push('redirect');
      });

      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        'https://idp.example.com/auth?client_id=abc',
      );

      await controller.login(req, res);

      expect(req.session.save).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith(
        'https://idp.example.com/auth?client_id=abc',
      );
      expect(callOrder).toEqual(['save', 'redirect']);
    });

    it('Should reject when session.save returns an error', async () => {
      const req = buildMockRequest();
      const res = buildMockResponse();
      req.session.save.mockImplementation((cb: (err?: Error) => void) =>
        cb(new Error('session save failed')),
      );
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        'https://idp.example.com/auth',
      );

      await expect(controller.login(req, res)).rejects.toThrow(
        'session save failed',
      );
    });

    it('Should not redirect when authService.buildAuthorizationUrl rejects', async () => {
      const req = buildMockRequest();
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockRejectedValue(
        new Error('oidc error'),
      );

      await expect(controller.login(req, res)).rejects.toThrow('oidc error');
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  describe('callback', () => {
    it('Should validate that the method callback is defined', () => {
      expect(controller).toHaveProperty('callback');
    });

    it('Should call authService.handleCallback with IdpType.IDIR, callback URL, and session', async () => {
      const req = buildMockRequest({
        protocol: 'https',
        host: 'api.example.com',
        originalUrl: '/auth/idir/callback?code=abc',
        session: { returnTo: '/admin' },
      });
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await controller.callback(req, res);

      expect(mockAuthService.handleCallback).toHaveBeenCalledTimes(1);
      const [idpArg, urlArg, sessionArg] =
        mockAuthService.handleCallback.mock.calls[0];
      expect(idpArg).toBe(IdpType.IDIR);
      expect(urlArg).toBeInstanceOf(URL);
      expect(urlArg.href).toBe(
        'https://api.example.com/auth/idir/callback?code=abc',
      );
      expect(sessionArg).toBe(req.session);
    });

    it('Should redirect to session returnTo on success and delete returnTo', async () => {
      const req = buildMockRequest({ session: { returnTo: '/admin/home' } });
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await controller.callback(req, res);

      expect(req.session).not.toHaveProperty('returnTo');
      expect(req.session.save).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/home');
    });

    it('Should redirect to ADMIN_FRONTEND_URL when returnTo is missing', async () => {
      const req = buildMockRequest({ session: {} });
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await controller.callback(req, res);

      expect(mockConfigService.get).toHaveBeenCalledWith('ADMIN_FRONTEND_URL');
      expect(res.redirect).toHaveBeenCalledWith(adminFrontendUrl);
    });

    it('Should reject when session.save fails on success path', async () => {
      const req = buildMockRequest({ session: { returnTo: '/admin' } });
      const res = buildMockResponse();
      req.session.save.mockImplementation((cb: (err?: Error) => void) =>
        cb(new Error('save error')),
      );
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await expect(controller.callback(req, res)).rejects.toThrow('save error');
    });

    it('Should log and redirect with auth_failed when handleCallback throws', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      const req = buildMockRequest();
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockRejectedValue(new Error('bad code'));

      await controller.callback(req, res);

      expect(loggerSpy).toHaveBeenCalledWith(
        'IDIR OIDC callback failed',
        'bad code',
      );
      expect(res.redirect).toHaveBeenCalledWith(
        `${adminFrontendUrl}?error=auth_failed`,
      );
      expect(req.session.save).not.toHaveBeenCalled();

      loggerSpy.mockRestore();
    });
  });

  describe('logout', () => {
    it('Should validate that the method logout is defined', () => {
      expect(controller).toHaveProperty('logout');
    });

    it('Should call authService.buildLogoutUrl with IdpType.IDIR and session', async () => {
      const req = buildMockRequest({ session: { idir: { accessToken: 'x' } } });
      const res = buildMockResponse();
      mockAuthService.buildLogoutUrl.mockReturnValue(
        'https://idp.example.com/logout',
      );

      await controller.logout(req, res);

      expect(mockAuthService.buildLogoutUrl).toHaveBeenCalledTimes(1);
      expect(mockAuthService.buildLogoutUrl).toHaveBeenCalledWith(
        IdpType.IDIR,
        req.session,
      );
    });

    it('Should delete session.idir, save session, and return logoutUrl JSON', async () => {
      const callOrder: string[] = [];
      const req = buildMockRequest({ session: { idir: { accessToken: 'x' } } });
      const res = buildMockResponse();
      const logoutUrl = 'https://idp.example.com/logout?hint=abc';

      req.session.save.mockImplementation((cb: (err?: Error) => void) => {
        callOrder.push('save');
        cb();
      });
      res.json.mockImplementation(() => {
        callOrder.push('json');
      });
      mockAuthService.buildLogoutUrl.mockReturnValue(logoutUrl);

      await controller.logout(req, res);

      expect(req.session).not.toHaveProperty('idir');
      expect(req.session.save).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ logoutUrl });
      expect(callOrder).toEqual(['save', 'json']);
    });

    it('Should reject when session.save returns an error', async () => {
      const req = buildMockRequest({ session: { idir: {} } });
      const res = buildMockResponse();
      req.session.save.mockImplementation((cb: (err?: Error) => void) =>
        cb(new Error('save failed')),
      );
      mockAuthService.buildLogoutUrl.mockReturnValue(
        'https://idp.example.com/logout',
      );

      await expect(controller.logout(req, res)).rejects.toThrow('save failed');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('Should validate that the method me is defined', () => {
      expect(controller).toHaveProperty('me');
    });

    it('Should call authService.getUserProfile with IdpType.IDIR and session', () => {
      const req = buildMockRequest();
      const profile = { sub: 'user-1', name: 'Admin User' };
      mockAuthService.getUserProfile.mockReturnValue(profile);

      controller.me(req);

      expect(mockAuthService.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockAuthService.getUserProfile).toHaveBeenCalledWith(
        IdpType.IDIR,
        req.session,
      );
    });

    it('Should return profile when it exists', () => {
      const req = buildMockRequest();
      const profile = { sub: 'user-2', name: 'Jane' };
      mockAuthService.getUserProfile.mockReturnValue(profile);

      const result = controller.me(req);

      expect(result).toEqual(profile);
    });

    it('Should throw UnauthorizedException when profile is null', () => {
      const req = buildMockRequest();
      mockAuthService.getUserProfile.mockReturnValue(null);

      expect(() => controller.me(req)).toThrow(UnauthorizedException);
    });

    it('Should throw UnauthorizedException when profile is undefined', () => {
      const req = buildMockRequest();
      mockAuthService.getUserProfile.mockReturnValue(undefined);

      expect(() => controller.me(req)).toThrow(UnauthorizedException);
    });
  });
});
