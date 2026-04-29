import type { Request } from 'express';
import { OrgUnitsAdminV1Controller } from '../org-units-admin-v1.controller';

describe('OrgUnitsAdminV1Controller', () => {
  let controller: OrgUnitsAdminV1Controller;
  let orgUnitsService: Record<string, jest.Mock>;
  let usersService: { getUserRoles: jest.Mock; searchStaffUsers: jest.Mock };

  const mockReq = (userId?: string): Request =>
    ({ session: { idir: { userId } } }) as unknown as Request;

  beforeEach(() => {
    orgUnitsService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      getChildren: jest.fn(),
      getAllowedChildTypes: jest.fn(),
      createChild: jest.fn(),
      getMembers: jest.fn(),
      addMemberById: jest.fn(),
      removeMember: jest.fn(),
      syncMinistries: jest.fn(),
    };
    usersService = {
      getUserRoles: jest.fn(),
      searchStaffUsers: jest.fn(),
    };
    controller = new OrgUnitsAdminV1Controller(
      orgUnitsService as never,
      usersService as never,
    );
  });

  it('findAll should pass admin=true for admin user', async () => {
    usersService.getUserRoles.mockResolvedValue(['admin']);
    orgUnitsService.findAll.mockResolvedValue({ data: [] });
    await controller.findAll(
      { page: 1, limit: 10, search: 'test' } as never,
      mockReq('u1'),
    );
    expect(orgUnitsService.findAll).toHaveBeenCalledWith(1, 10, {
      userId: 'u1',
      isGlobalAdmin: true,
      search: 'test',
    });
  });

  it('findAll should pass admin=false for non-admin', async () => {
    usersService.getUserRoles.mockResolvedValue(['staff']);
    orgUnitsService.findAll.mockResolvedValue({ data: [] });
    await controller.findAll({ page: 1, limit: 10 } as never, mockReq('u1'));
    expect(orgUnitsService.findAll).toHaveBeenCalledWith(1, 10, {
      userId: 'u1',
      isGlobalAdmin: false,
      search: undefined,
    });
  });

  it('findAll handles missing userId', async () => {
    orgUnitsService.findAll.mockResolvedValue({ data: [] });
    await controller.findAll(
      { page: 1, limit: 10 } as never,
      { session: { idir: {} } } as unknown as Request,
    );
    expect(orgUnitsService.findAll).toHaveBeenCalledWith(1, 10, {
      userId: '',
      isGlobalAdmin: false,
      search: undefined,
    });
  });

  it('findOne should delegate', () => {
    controller.findOne({ id: 'o1' } as never);
    expect(orgUnitsService.findById).toHaveBeenCalledWith('o1');
  });

  it('getChildren should delegate', () => {
    controller.getChildren({ id: 'o1' } as never);
    expect(orgUnitsService.getChildren).toHaveBeenCalledWith('o1');
  });

  it('getAllowedChildTypes should delegate', () => {
    controller.getAllowedChildTypes({ id: 'o1' } as never);
    expect(orgUnitsService.getAllowedChildTypes).toHaveBeenCalledWith('o1');
  });

  it('createChild should delegate', () => {
    controller.createChild(
      { id: 'o1' } as never,
      { name: 'Child', type: 'team' } as never,
    );
    expect(orgUnitsService.createChild).toHaveBeenCalledWith(
      'o1',
      'Child',
      'team',
    );
  });

  it('getMembers should delegate', () => {
    controller.getMembers({ id: 'o1' } as never);
    expect(orgUnitsService.getMembers).toHaveBeenCalledWith('o1');
  });

  it('searchUsers should delegate', () => {
    controller.searchUsers(
      { id: 'o1' } as never,
      { q: 'test', limit: 5 } as never,
    );
    expect(usersService.searchStaffUsers).toHaveBeenCalledWith('test', 'o1', 5);
  });

  it('addMember should delegate', () => {
    controller.addMember(
      { id: 'o1' } as never,
      { userId: 'u2', role: 'member' } as never,
    );
    expect(orgUnitsService.addMemberById).toHaveBeenCalledWith(
      'o1',
      'u2',
      'member',
    );
  });

  it('removeMember should delegate', () => {
    controller.removeMember({ id: 'o1', memberId: 'u2' } as never);
    expect(orgUnitsService.removeMember).toHaveBeenCalledWith('o1', 'u2');
  });

  it('syncMinistries should delegate', () => {
    controller.syncMinistries();
    expect(orgUnitsService.syncMinistries).toHaveBeenCalled();
  });
});
