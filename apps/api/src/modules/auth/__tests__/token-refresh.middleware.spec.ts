import { TokenRefreshMiddleware } from '../middleware/token-refresh.middleware';
import { AuthService } from '../services/auth.service';
import { IdpType } from '../types/idp';

const mockAuthService = {
  hasActiveSession: jest.fn(),
  isTokenExpiringSoon: jest.fn(),
  refreshTokens: jest.fn(),
};

describe('TokenRefreshMiddleware Unit Test', () => {
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

  it('Should call next without refreshing when no active sessions', async () => {
    mockAuthService.hasActiveSession.mockReturnValue(false);
    const req = { session: {} } as never;
    const res = {} as never;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(mockAuthService.refreshTokens).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('Should refresh token for IDP with expiring session', async () => {
    mockAuthService.hasActiveSession.mockImplementation(
      (idpType: IdpType) => idpType === IdpType.BCSC,
    );
    mockAuthService.isTokenExpiringSoon.mockImplementation(
      (idpType: IdpType) => idpType === IdpType.BCSC,
    );
    mockAuthService.refreshTokens.mockResolvedValue(true);

    const req = {
      session: { bcsc: { accessToken: 'token' } },
    } as never;
    const res = {} as never;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
      IdpType.BCSC,
      expect.anything(),
    );
    expect(next).toHaveBeenCalled();
  });

  it('Should not refresh when token is not expiring', async () => {
    mockAuthService.hasActiveSession.mockReturnValue(true);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(false);

    const req = {
      session: { bcsc: { accessToken: 'token' } },
    } as never;
    const res = {} as never;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(mockAuthService.refreshTokens).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('Should refresh multiple IDP sessions in parallel', async () => {
    mockAuthService.hasActiveSession.mockReturnValue(true);
    mockAuthService.isTokenExpiringSoon.mockReturnValue(true);
    mockAuthService.refreshTokens.mockResolvedValue(true);

    const req = {
      session: {
        bcsc: { accessToken: 'bcsc-token' },
        idir: { accessToken: 'idir-token' },
      },
    } as never;
    const res = {} as never;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
      IdpType.BCSC,
      expect.anything(),
    );
    expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
      IdpType.IDIR,
      expect.anything(),
    );
    expect(next).toHaveBeenCalled();
  });
});
