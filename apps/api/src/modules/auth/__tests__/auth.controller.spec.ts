import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';

const mockAuthService = {
  buildAuthorizationUrl: jest.fn(),
  handleCallback: jest.fn(),
  buildLogoutUrl: jest.fn(),
  getUserProfile: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      FRONTEND_URL: 'https://frontend.example.com',
      OIDC_REDIRECT_URI: 'https://api.example.com/api/auth/callback',
    };
    return config[key];
  }),
};

function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    query: {},
    protocol: 'https',
    get: jest.fn().mockReturnValue('example.com'),
    originalUrl: '/auth/callback?code=abc',
    session: {
      save: jest.fn((cb: (err?: Error) => void) => cb()),
      destroy: jest.fn((cb: (err?: Error) => void) => cb()),
      ...((overrides.session as Record<string, unknown>) ?? {}),
    },
    ...overrides,
  };
}

function createMockResponse() {
  const res = {
    redirect: jest.fn(),
    json: jest.fn(),
    status: jest.fn(),
    clearCookie: jest.fn(),
  };
  res.status = jest.fn().mockReturnValue(res);
  return res;
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('Should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('Should redirect to authorization URL', async () => {
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        'https://idp.example.com/authorize',
      );
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.login(req as never, res as never);

      expect(mockAuthService.buildAuthorizationUrl).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'https://idp.example.com/authorize',
      );
    });

    it('Should store returnTo from query param', async () => {
      mockAuthService.buildAuthorizationUrl.mockResolvedValue(
        'https://idp.example.com/authorize',
      );
      const req = createMockRequest({
        query: { returnTo: 'https://frontend.example.com/dashboard' },
      });
      const res = createMockResponse();

      await controller.login(req as never, res as never);

      expect(req.session.returnTo).toBe(
        'https://frontend.example.com/dashboard',
      );
    });
  });

  describe('callback', () => {
    it('Should handle callback and redirect to returnTo', async () => {
      mockAuthService.handleCallback.mockResolvedValue(undefined);
      const req = createMockRequest({
        session: {
          returnTo: 'https://frontend.example.com/dashboard',
          save: jest.fn((cb: (err?: Error) => void) => cb()),
          destroy: jest.fn(),
        },
      });
      const res = createMockResponse();

      await controller.callback(req as never, res as never);

      expect(mockAuthService.handleCallback).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'https://frontend.example.com/dashboard',
      );
    });

    it('Should redirect with error when callback fails', async () => {
      mockAuthService.handleCallback.mockRejectedValue(new Error('OIDC error'));
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.callback(req as never, res as never);

      expect(res.redirect).toHaveBeenCalledWith(
        'https://frontend.example.com?error=auth_failed',
      );
    });
  });

  describe('logout', () => {
    it('Should destroy session and return logout URL', async () => {
      mockAuthService.buildLogoutUrl.mockReturnValue(
        'https://idp.example.com/logout',
      );
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.logout(req as never, res as never);

      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('connect.sid');
      expect(res.json).toHaveBeenCalledWith({
        logoutUrl: 'https://idp.example.com/logout',
      });
    });
  });

  describe('me', () => {
    it('Should return user profile', () => {
      const profile = { sub: 'user-1', name: 'Test User' };
      mockAuthService.getUserProfile.mockReturnValue(profile);
      const req = createMockRequest();

      const result = controller.me(req as never);
      expect(result).toEqual(profile);
    });

    it('Should throw when no profile exists', () => {
      mockAuthService.getUserProfile.mockReturnValue(null);
      const req = createMockRequest();

      expect(() => controller.me(req as never)).toThrow(UnauthorizedException);
    });
  });
});
