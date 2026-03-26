import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AppConfigDto } from 'src/common/dtos/app-config.dto';
import {
  buildMockRequest,
  buildMockResponse,
  mockAuthService,
  mockConfigService,
} from 'tests/utils/auth.controllers.mock';
import { BcscAuthController } from '../controllers/bcsc-auth.controller';
import { AuthService } from '../services/auth.service';
import { IdpType } from '../types/idp';

describe('BcscAuthController', () => {
  let controller: BcscAuthController;

  const authUrl = 'https://idp.example.com/auth';
  const frontendUrl = 'https://frontend.example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(frontendUrl);
    controller = new BcscAuthController(
      mockAuthService as unknown as AuthService,
      mockConfigService as unknown as ConfigService<AppConfigDto, true>,
    );
  });

  describe('login', () => {
    it('Should validate that the method login is defined', () => {
      expect(controller).toHaveProperty('login');
    });

    it('Should use req.query.returnTo when present and set it on session', async () => {
      const req = buildMockRequest({ query: { returnTo: '/dashboard' } });
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(authUrl);

      await controller.login(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(req.session.returnTo).toBe('/dashboard');
    });

    it('Should fall back to FRONTEND_URL when req.query.returnTo is absent', async () => {
      const req = buildMockRequest({ query: {} });
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(authUrl);

      await controller.login(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(mockConfigService.get).toHaveBeenCalledWith('FRONTEND_URL');
      expect(req.session.returnTo).toBe(frontendUrl);
    });

    it('Should call authService.buildAuthorizationUrl with IdpType.BCSC and the session', async () => {
      const req = buildMockRequest();
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(authUrl);

      await controller.login(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(mockAuthService.buildAuthorizationUrl).toHaveBeenCalledTimes(1);
      expect(mockAuthService.buildAuthorizationUrl).toHaveBeenCalledWith(
        IdpType.BCSC,
        req.session,
      );
    });

    it('Should save the session before redirecting', async () => {
      const req = buildMockRequest();
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(authUrl);

      await controller.login(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(req.session.save).toHaveBeenCalledTimes(1);
    });

    it('Should call res.redirect with the auth URL returned from authService', async () => {
      const returnUrl = `${authUrl}?client_id=x`;
      const req = buildMockRequest();
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(returnUrl);

      await controller.login(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.redirect).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith(returnUrl);
    });

    it('Should call res.redirect after saving the session', async () => {
      const callOrder: string[] = [];
      const req = buildMockRequest();
      req.session.save.mockImplementation((cb: (err?: Error) => void) => {
        callOrder.push('save');
        cb();
      });
      const res = buildMockResponse();
      res.redirect.mockImplementation(() => {
        callOrder.push('redirect');
      });
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(authUrl);

      await controller.login(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(callOrder).toEqual(['save', 'redirect']);
    });

    it('Should reject when session.save returns an error', async () => {
      const req = buildMockRequest();
      const saveError = new Error('Session save failed');
      req.session.save.mockImplementation((cb: (err?: Error) => void) =>
        cb(saveError),
      );
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(authUrl);

      await expect(
        controller.login(req as unknown as Request, res as unknown as Response),
      ).rejects.toThrow('Session save failed');
    });

    it('Should not call res.redirect when authService.buildAuthorizationUrl rejects', async () => {
      const req = buildMockRequest();
      const res = buildMockResponse();
      mockAuthService.buildAuthorizationUrl.mockRejectedValue(
        new Error('OIDC error'),
      );

      await expect(
        controller.login(req as unknown as Request, res as unknown as Response),
      ).rejects.toThrow('OIDC error');

      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  describe('callback', () => {
    it('Should validate that the method callback is defined', () => {
      expect(controller).toHaveProperty('callback');
    });

    it('Should call authService.handleCallback with IdpType.BCSC, callbackUrl, and session', async () => {
      const req = buildMockRequest({
        protocol: 'https',
        host: 'api.example.com',
        originalUrl: '/auth/bcsc/callback?code=abc',
        session: { returnTo: '/home' },
      });
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await controller.callback(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(mockAuthService.handleCallback).toHaveBeenCalledTimes(1);
      const [idpArg, urlArg] = mockAuthService.handleCallback.mock.calls[0] as [
        IdpType,
        URL,
        unknown,
      ];
      expect(idpArg).toBe(IdpType.BCSC);
      expect(urlArg).toBeInstanceOf(URL);
      expect(urlArg.href).toBe(
        'https://api.example.com/auth/bcsc/callback?code=abc',
      );
    });

    it('Should redirect to session.returnTo on successful callback', async () => {
      const req = buildMockRequest({
        session: { returnTo: '/dashboard' },
      });
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await controller.callback(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('Should redirect to FRONTEND_URL on successful callback when session.returnTo is absent', async () => {
      const req = buildMockRequest({ session: {} });
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await controller.callback(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(mockConfigService.get).toHaveBeenCalledWith('FRONTEND_URL');
      expect(res.redirect).toHaveBeenCalledWith(frontendUrl);
    });

    it('Should delete session.returnTo after reading it on success', async () => {
      const req = buildMockRequest({ session: { returnTo: '/home' } });
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await controller.callback(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(req.session).not.toHaveProperty('returnTo');
    });

    it('Should save the session before redirecting on success', async () => {
      const callOrder: string[] = [];
      const req = buildMockRequest({ session: { returnTo: '/home' } });
      req.session.save.mockImplementation((cb: (err?: Error) => void) => {
        callOrder.push('save');
        cb();
      });
      const res = buildMockResponse();
      res.redirect.mockImplementation(() => {
        callOrder.push('redirect');
      });
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await controller.callback(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(callOrder).toEqual(['save', 'redirect']);
    });

    it('Should reject when session.save returns an error on success path', async () => {
      const req = buildMockRequest({ session: { returnTo: '/home' } });
      const saveError = new Error('Save failed');
      req.session.save.mockImplementation((cb: (err?: Error) => void) =>
        cb(saveError),
      );
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockResolvedValue(undefined);

      await expect(
        controller.callback(
          req as unknown as Request,
          res as unknown as Response,
        ),
      ).rejects.toThrow('Save failed');
    });

    it('Should redirect to FRONTEND_URL?error=auth_failed when handleCallback throws', async () => {
      const req = buildMockRequest();
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockRejectedValue(
        new Error('OIDC failed'),
      );

      await controller.callback(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.redirect).toHaveBeenCalledWith(
        `${frontendUrl}?error=auth_failed`,
      );
    });

    it('Should not save session when handleCallback throws', async () => {
      const req = buildMockRequest();
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockRejectedValue(new Error('Fail'));

      await controller.callback(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(req.session.save).not.toHaveBeenCalled();
    });

    it('Should not redirect to returnTo when handleCallback throws', async () => {
      const req = buildMockRequest({ session: { returnTo: '/secret' } });
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockRejectedValue(new Error('Fail'));

      await controller.callback(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.redirect).not.toHaveBeenCalledWith('/secret');
    });

    it('Should call res.redirect exactly once on error path', async () => {
      const req = buildMockRequest();
      const res = buildMockResponse();
      mockAuthService.handleCallback.mockRejectedValue(new Error('Fail'));

      await controller.callback(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.redirect).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('Should validate that the method logout is defined', () => {
      expect(controller).toHaveProperty('logout');
    });

    it('Should call authService.buildLogoutUrl with IdpType.BCSC and session', async () => {
      const req = buildMockRequest({
        session: { bcsc: { accessToken: 'tok' } },
      });
      const res = buildMockResponse();
      mockAuthService.buildLogoutUrl.mockReturnValue(
        'https://idp.example.com/logout',
      );

      await controller.logout(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(mockAuthService.buildLogoutUrl).toHaveBeenCalledTimes(1);
      expect(mockAuthService.buildLogoutUrl).toHaveBeenCalledWith(
        IdpType.BCSC,
        req.session,
      );
    });

    it('Should delete session.bcsc before saving', async () => {
      const callOrder = [] as string[];
      const req = buildMockRequest({
        session: { bcsc: { accessToken: 'tok' } },
      });
      req.session.save.mockImplementation((cb: (err?: Error) => void) => {
        callOrder.push('save');
        cb();
      });
      const res = buildMockResponse();
      mockAuthService.buildLogoutUrl.mockReturnValue(
        'https://idp.example.com/logout',
      );

      await controller.logout(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(req.session).not.toHaveProperty('bcsc');
    });

    it('Should save the session before calling res.json', async () => {
      const callOrder: string[] = [];
      const req = buildMockRequest({ session: { bcsc: {} } });
      req.session.save.mockImplementation((cb: (err?: Error) => void) => {
        callOrder.push('save');
        cb();
      });
      const res = buildMockResponse();
      res.json.mockImplementation(() => {
        callOrder.push('json');
      });
      mockAuthService.buildLogoutUrl.mockReturnValue(
        'https://idp.example.com/logout',
      );

      await controller.logout(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(callOrder).toEqual(['save', 'json']);
    });

    it('Should call res.json with the logoutUrl', async () => {
      const logoutUrl = 'https://idp.example.com/logout?id_token_hint=xyz';
      const req = buildMockRequest({ session: { bcsc: {} } });
      const res = buildMockResponse();
      mockAuthService.buildLogoutUrl.mockReturnValue(logoutUrl);

      await controller.logout(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.json).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ logoutUrl });
    });

    it('Should reject when session.save returns an error', async () => {
      const req = buildMockRequest({ session: { bcsc: {} } });
      const saveError = new Error('Cannot save session');
      req.session.save.mockImplementation((cb: (err?: Error) => void) =>
        cb(saveError),
      );
      const res = buildMockResponse();
      mockAuthService.buildLogoutUrl.mockReturnValue(
        'https://idp.example.com/logout',
      );

      await expect(
        controller.logout(
          req as unknown as Request,
          res as unknown as Response,
        ),
      ).rejects.toThrow('Cannot save session');
    });

    it('Should not call res.json when session.save errors', async () => {
      const req = buildMockRequest({ session: { bcsc: {} } });
      req.session.save.mockImplementation((cb: (err?: Error) => void) =>
        cb(new Error('fail')),
      );
      const res = buildMockResponse();
      mockAuthService.buildLogoutUrl.mockReturnValue(
        'https://idp.example.com/logout',
      );

      await expect(
        controller.logout(
          req as unknown as Request,
          res as unknown as Response,
        ),
      ).rejects.toThrow();

      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('Should validate that the method me is defined', () => {
      expect(controller).toHaveProperty('me');
    });

    it('Should return the user profile when authService.getUserProfile returns a value', () => {
      const profile = { sub: 'user-123', name: 'Jane Doe' };
      const req = buildMockRequest();
      mockAuthService.getUserProfile.mockReturnValue(profile);

      const result = controller.me(req as unknown as Request);

      expect(result).toEqual(profile);
    });

    it('Should call authService.getUserProfile with IdpType.BCSC and the session', () => {
      const profile = { sub: 'user-456' };
      const req = buildMockRequest();
      mockAuthService.getUserProfile.mockReturnValue(profile);

      controller.me(req as unknown as Request);

      expect(mockAuthService.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockAuthService.getUserProfile).toHaveBeenCalledWith(
        IdpType.BCSC,
        req.session,
      );
    });

    it('Should throw UnauthorizedException when authService.getUserProfile returns null', () => {
      const req = buildMockRequest();
      mockAuthService.getUserProfile.mockReturnValue(null);

      expect(() => controller.me(req as unknown as Request)).toThrow(
        UnauthorizedException,
      );
    });

    it('Should throw UnauthorizedException when authService.getUserProfile returns undefined', () => {
      const req = buildMockRequest();
      mockAuthService.getUserProfile.mockReturnValue(undefined);

      expect(() => controller.me(req as unknown as Request)).toThrow(
        UnauthorizedException,
      );
    });

    it('Should not throw when authService.getUserProfile returns a non-null profile', () => {
      const req = buildMockRequest();
      mockAuthService.getUserProfile.mockReturnValue({ sub: 'user-789' });

      expect(() => controller.me(req as unknown as Request)).not.toThrow();
    });

    it('Should return different profiles on successive calls', () => {
      const req = buildMockRequest();
      const profileA = { sub: 'a' };
      const profileB = { sub: 'b' };
      mockAuthService.getUserProfile
        .mockReturnValueOnce(profileA)
        .mockReturnValueOnce(profileB);

      expect(controller.me(req as unknown as Request)).toEqual(profileA);
      expect(controller.me(req as unknown as Request)).toEqual(profileB);
    });
  });
});
