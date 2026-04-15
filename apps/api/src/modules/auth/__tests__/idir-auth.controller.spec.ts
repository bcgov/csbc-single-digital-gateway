import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { UsersService } from 'src/modules/users/services/users.service';
import {
  buildMockRequest,
  buildMockResponse,
  mockAuthService,
  mockConfigService,
} from 'tests/utils/mock.auth.controllers';
import { IdirAuthController } from '../controllers/idir-auth.controller';
import { AuthService } from '../services/auth.service';
import { IdpType } from '../types/idp';

const mockUsersService = {
  getUserRoles: jest.fn().mockResolvedValue([]),
};

describe('IdirAuthController Unit Test', () => {
  let controller: IdirAuthController;

  const adminFrontendUrl = 'https://admin.example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(adminFrontendUrl);

    mockUsersService.getUserRoles.mockResolvedValue([]);
    controller = new IdirAuthController(
      mockAuthService as unknown as AuthService,
      mockConfigService as unknown as ConfigService<AppConfigDto, true>,
      mockUsersService as unknown as UsersService,
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
      expect(urlArg).toEqual(expect.objectContaining({}));
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

    it('Should call authService.getUserProfile with IdpType.IDIR and session', async () => {
      const req = buildMockRequest();
      const profile = { sub: 'user-1', name: 'Admin User' };
      mockAuthService.getUserProfile.mockReturnValue(profile);

      await controller.me(req);

      expect(mockAuthService.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockAuthService.getUserProfile).toHaveBeenCalledWith(
        IdpType.IDIR,
        req.session,
      );
    });

    it('Should return profile with roles when it exists', async () => {
      const req = buildMockRequest();
      const profile = { sub: 'user-2', name: 'Jane' };
      mockAuthService.getUserProfile.mockReturnValue(profile);

      const result = await controller.me(req);

      expect(result).toEqual({ ...profile, roles: [] });
    });

    it('Should throw UnauthorizedException when profile is null', async () => {
      const req = buildMockRequest();
      mockAuthService.getUserProfile.mockReturnValue(null);

      await expect(controller.me(req)).rejects.toThrow(UnauthorizedException);
    });

    it('Should throw UnauthorizedException when profile is undefined', async () => {
      const req = buildMockRequest();
      mockAuthService.getUserProfile.mockReturnValue(undefined);

      await expect(controller.me(req)).rejects.toThrow(UnauthorizedException);
    });
  });
});
