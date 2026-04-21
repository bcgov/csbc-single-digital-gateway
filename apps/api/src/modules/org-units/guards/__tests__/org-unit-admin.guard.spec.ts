import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { type Database } from '@repo/db';
import { OrgUnitAdminGuard } from '../org-unit-admin.guard';

describe('OrgUnitAdminGuard', () => {
  let guard: OrgUnitAdminGuard;
  let usersService: { getUserRoles: jest.Mock };
  let orgUnitsService: { isAncestorAdmin: jest.Mock };
  let selectLimitMock: jest.Mock;
  let db: { select: jest.Mock };

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
    usersService = { getUserRoles: jest.fn() };
    orgUnitsService = { isAncestorAdmin: jest.fn() };
    selectLimitMock = jest.fn();
    db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: selectLimitMock,
          }),
        }),
      }),
    };
    guard = new OrgUnitAdminGuard(
      usersService as never,
      orgUnitsService as never,
      db as unknown as Database,
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
      createContext({ idir: { userId: 'u1' } }, { id: 'org1' }),
    );
    expect(result).toBe(true);
  });

  it('should throw when no orgUnitId param', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    await expect(
      guard.canActivate(createContext({ idir: { userId: 'u1' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return true when user is direct admin member', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    selectLimitMock.mockResolvedValue([{ role: 'admin' }]);

    const result = await guard.canActivate(
      createContext({ idir: { userId: 'u1' } }, { id: 'org1' }),
    );
    expect(result).toBe(true);
  });

  it('should return true when user is ancestor admin', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    selectLimitMock.mockResolvedValue([]);
    orgUnitsService.isAncestorAdmin.mockResolvedValue(true);

    const result = await guard.canActivate(
      createContext({ idir: { userId: 'u1' } }, { id: 'org1' }),
    );
    expect(result).toBe(true);
    expect(orgUnitsService.isAncestorAdmin).toHaveBeenCalledWith('org1', 'u1');
  });

  it('should throw when user is neither direct nor ancestor admin', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    selectLimitMock.mockResolvedValue([]);
    orgUnitsService.isAncestorAdmin.mockResolvedValue(false);

    await expect(
      guard.canActivate(
        createContext({ idir: { userId: 'u1' } }, { id: 'org1' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
