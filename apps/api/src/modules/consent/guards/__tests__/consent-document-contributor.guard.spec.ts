import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsentDocumentContributorGuard } from '../consent-document-contributor.guard';

describe('ConsentDocumentContributorGuard', () => {
  let guard: ConsentDocumentContributorGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let usersService: { getUserRoles: jest.Mock };
  let contributorsService: { getContributorRole: jest.Mock };

  const createContext = (
    session?: Record<string, unknown>,
    params: Record<string, string> = {},
  ): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ session, params }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    usersService = { getUserRoles: jest.fn() };
    contributorsService = { getContributorRole: jest.fn() };
    guard = new ConsentDocumentContributorGuard(
      reflector as unknown as Reflector,
      usersService as never,
      contributorsService as never,
    );
  });

  it('should throw when no userId in session', async () => {
    await expect(
      guard.canActivate(createContext({ idir: {} })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return true for global admin', async () => {
    usersService.getUserRoles.mockResolvedValue(['admin']);
    const result = await guard.canActivate(
      createContext({ idir: { userId: 'u1' } }, { docId: 'd1' }),
    );
    expect(result).toBe(true);
    expect(contributorsService.getContributorRole).not.toHaveBeenCalled();
  });

  it('should throw when no docId param', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    await expect(
      guard.canActivate(createContext({ idir: { userId: 'u1' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw when user is not a contributor', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    contributorsService.getContributorRole.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        createContext({ idir: { userId: 'u1' } }, { docId: 'd1' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return true when user is a contributor', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    contributorsService.getContributorRole.mockResolvedValue('contributor');
    const result = await guard.canActivate(
      createContext({ idir: { userId: 'u1' } }, { docId: 'd1' }),
    );
    expect(result).toBe(true);
  });

  it('should return true when requiresOwner and user is owner', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    usersService.getUserRoles.mockResolvedValue(['staff']);
    contributorsService.getContributorRole.mockResolvedValue('owner');
    const result = await guard.canActivate(
      createContext({ idir: { userId: 'u1' } }, { docId: 'd1' }),
    );
    expect(result).toBe(true);
  });

  it('should throw when requiresOwner but user is not owner', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    usersService.getUserRoles.mockResolvedValue(['staff']);
    contributorsService.getContributorRole.mockResolvedValue('contributor');
    await expect(
      guard.canActivate(
        createContext({ idir: { userId: 'u1' } }, { docId: 'd1' }),
      ),
    ).rejects.toThrow('Only document owners can perform this action');
  });
});
