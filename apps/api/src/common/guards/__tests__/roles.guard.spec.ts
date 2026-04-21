import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let usersService: { getUserRoles: jest.Mock };

  const createContext = (session?: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ session }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    usersService = { getUserRoles: jest.fn() };
    guard = new RolesGuard(
      reflector as unknown as Reflector,
      usersService as never,
    );
  });

  it('should return true when no roles are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(createContext());
    expect(result).toBe(true);
  });

  it('should return true when required roles is empty', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const result = await guard.canActivate(createContext());
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when roles declared but no IDP', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(['admin'])
      .mockReturnValueOnce(undefined);

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when no userId in session for required IDP', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(['staff'])
      .mockReturnValueOnce('idir');

    await expect(
      guard.canActivate(createContext({ idir: {} })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return true when user has required role', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(['staff'])
      .mockReturnValueOnce('idir');

    usersService.getUserRoles.mockResolvedValue(['staff']);

    const result = await guard.canActivate(
      createContext({ idir: { userId: 'u1' } }),
    );
    expect(result).toBe(true);
    expect(usersService.getUserRoles).toHaveBeenCalledWith('u1');
  });

  it('should throw ForbiddenException when user lacks required role', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(['admin'])
      .mockReturnValueOnce('idir');

    usersService.getUserRoles.mockResolvedValue(['staff']);

    await expect(
      guard.canActivate(createContext({ idir: { userId: 'u1' } })),
    ).rejects.toThrow('Insufficient permissions');
  });

  it('should return true when user has one of multiple required roles', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(['admin', 'staff'])
      .mockReturnValueOnce('idir');

    usersService.getUserRoles.mockResolvedValue(['staff']);

    const result = await guard.canActivate(
      createContext({ idir: { userId: 'u1' } }),
    );
    expect(result).toBe(true);
  });
});
