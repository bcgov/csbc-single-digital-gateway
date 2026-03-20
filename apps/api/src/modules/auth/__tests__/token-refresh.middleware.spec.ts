import { TokenRefreshMiddleware } from '../middleware/token-refresh.middleware';
import { AuthService } from '../auth.service';

const mockAuthService = {
  isTokenExpiringSoon: jest.fn(),
  refreshTokens: jest.fn(),
};

describe('TokenRefreshMiddleware', () => {
  let middleware: TokenRefreshMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new TokenRefreshMiddleware(
      mockAuthService as unknown as AuthService,
    );
  });

  it('Should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('Should call next without refreshing when no session token', async () => {
    const req = { session: {} } as never;
    const res = {} as never;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(mockAuthService.isTokenExpiringSoon).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('Should refresh token when expiring soon', async () => {
    mockAuthService.isTokenExpiringSoon.mockReturnValue(true);
    mockAuthService.refreshTokens.mockResolvedValue(true);
    const req = { session: { accessToken: 'token' } } as never;
    const res = {} as never;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(mockAuthService.refreshTokens).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('Should not refresh when token is not expiring', async () => {
    mockAuthService.isTokenExpiringSoon.mockReturnValue(false);
    const req = { session: { accessToken: 'token' } } as never;
    const res = {} as never;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(mockAuthService.refreshTokens).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
