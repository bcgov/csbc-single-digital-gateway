import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WorkspacesV1Controller } from '../../../../../src/modules/workspaces/controllers/workspaces-v1.controller';
import type {
  CreateWorkspaceDto,
  ListWorkspacesQueryDto,
  ListMembersQueryDto,
  AddableStaffQueryDto,
  AddMemberDto,
  UpdateMemberDto,
  TransferOwnershipDto,
  UpdateWorkspaceDto,
} from '../../../../../src/modules/workspaces/dtos/workspace.dtos';
import { mockUser } from '../../../../utils/fixtures';

describe('WorkspacesV1Controller', () => {
  let controller: WorkspacesV1Controller;
  let workspacesServiceMock: any;

  beforeEach(() => {
    workspacesServiceMock = {
      list: vi.fn(),
      create: vi.fn(),
      getBySlug: vi.fn(),
      get: vi.fn(),
      listMembers: vi.fn(),
      listMembersPage: vi.fn(),
      listAddableStaff: vi.fn(),
      addMember: vi.fn(),
      updateMember: vi.fn(),
      transferOwnership: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    controller = new WorkspacesV1Controller(workspacesServiceMock);
  });

  describe('list', () => {
    it('Should call list on workspaces service', async () => {
      const query: ListWorkspacesQueryDto = { limit: 10, offset: 0, sort: 'name', order: 'asc' };
      workspacesServiceMock.list.mockResolvedValue({ items: [] });

      const result = await controller.list(mockUser, query);

      expect(workspacesServiceMock.list).toHaveBeenCalledWith(mockUser.id, query);
      expect(result).toEqual({ items: [] });
    });
  });

  describe('create', () => {
    it('Should call create on workspaces service', async () => {
      const body: CreateWorkspaceDto = { name: 'New Workspace' };
      const mockResult = { id: 'ws-1', name: 'New Workspace' };
      workspacesServiceMock.create.mockResolvedValue(mockResult);

      const result = await controller.create(mockUser, body);

      expect(workspacesServiceMock.create).toHaveBeenCalledWith(mockUser.id, body);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getBySlug', () => {
    it('Should call getBySlug on workspaces service', async () => {
      const mockResult = { id: 'ws-1', slug: 'my-workspace' };
      workspacesServiceMock.getBySlug.mockResolvedValue(mockResult);

      const result = await controller.getBySlug(mockUser, 'my-workspace');

      expect(workspacesServiceMock.getBySlug).toHaveBeenCalledWith(mockUser.id, 'my-workspace');
      expect(result).toEqual(mockResult);
    });
  });

  describe('get', () => {
    it('Should call get on workspaces service', async () => {
      const mockResult = { id: 'ws-1', name: 'Workspace 1' };
      workspacesServiceMock.get.mockResolvedValue(mockResult);

      const result = await controller.get(mockUser, 'ws-1');

      expect(workspacesServiceMock.get).toHaveBeenCalledWith(mockUser.id, 'ws-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('listMembers', () => {
    it('Should call listMembers on workspaces service', async () => {
      const mockResult = { items: [] };
      workspacesServiceMock.listMembers.mockResolvedValue(mockResult);

      const result = await controller.listMembers(mockUser, 'ws-1');

      expect(workspacesServiceMock.listMembers).toHaveBeenCalledWith(mockUser.id, 'ws-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('listMembersPage', () => {
    it('Should call listMembersPage on workspaces service', async () => {
      const query: ListMembersQueryDto = {
        limit: 10,
        offset: 0,
        sort: 'role',
        order: 'asc',
        q: 'test',
      };
      const mockResult = { items: [], total: 0, limit: 10, offset: 0 };
      workspacesServiceMock.listMembersPage.mockResolvedValue(mockResult);

      const result = await controller.listMembersPage(mockUser, 'ws-1', query);

      expect(workspacesServiceMock.listMembersPage).toHaveBeenCalledWith(
        mockUser.id,
        'ws-1',
        query,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('listAddableStaff', () => {
    it('Should call listAddableStaff on workspaces service', async () => {
      const query: AddableStaffQueryDto = { q: 'staff' };
      const mockResult = { items: [] };
      workspacesServiceMock.listAddableStaff.mockResolvedValue(mockResult);

      const result = await controller.listAddableStaff(mockUser, 'ws-1', query);

      expect(workspacesServiceMock.listAddableStaff).toHaveBeenCalledWith(
        mockUser.id,
        'ws-1',
        query,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('addMember', () => {
    it('Should call addMember on workspaces service', async () => {
      const body: AddMemberDto = { userId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991', role: 'member' };
      const mockResult = {
        id: 'member-1',
        userId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        role: 'member',
      };
      workspacesServiceMock.addMember.mockResolvedValue(mockResult);

      const result = await controller.addMember(mockUser, 'ws-1', body);

      expect(workspacesServiceMock.addMember).toHaveBeenCalledWith(mockUser.id, 'ws-1', body);
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateMember', () => {
    it('Should call updateMember on workspaces service', async () => {
      const body: UpdateMemberDto = { role: 'admin' };
      workspacesServiceMock.updateMember.mockResolvedValue(undefined);

      await controller.updateMember(mockUser, 'ws-1', 'member-1', body);

      expect(workspacesServiceMock.updateMember).toHaveBeenCalledWith(
        mockUser.id,
        'ws-1',
        'member-1',
        body,
      );
    });
  });

  describe('transferOwnership', () => {
    it('Should call transferOwnership on workspaces service', async () => {
      const body: TransferOwnershipDto = { userId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991' };
      const mockResult = { id: 'ws-1', ownerId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991' };
      workspacesServiceMock.transferOwnership.mockResolvedValue(mockResult);

      const result = await controller.transferOwnership(mockUser, 'ws-1', body);

      expect(workspacesServiceMock.transferOwnership).toHaveBeenCalledWith(
        mockUser.id,
        'ws-1',
        body,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    it('Should call update on workspaces service', async () => {
      const body: UpdateWorkspaceDto = { name: 'Updated Workspace' };
      const mockResult = { id: 'ws-1', name: 'Updated Workspace' };
      workspacesServiceMock.update.mockResolvedValue(mockResult);

      const result = await controller.update(mockUser, 'ws-1', body);

      expect(workspacesServiceMock.update).toHaveBeenCalledWith(mockUser.id, 'ws-1', body);
      expect(result).toEqual(mockResult);
    });
  });

  describe('remove', () => {
    it('Should call remove on workspaces service', async () => {
      workspacesServiceMock.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, 'ws-1');

      expect(workspacesServiceMock.remove).toHaveBeenCalledWith(mockUser.id, 'ws-1');
    });
  });
});
