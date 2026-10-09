import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WorkspacesService } from '../../../../../src/modules/workspaces/services/workspaces.service';
import { workspaces, workspaceMembers } from '@repo/database';
import { createMockQuery } from '../../../../utils/create-mock-query';
import { createMockDb } from '../../../../utils/create-db-mock';

vi.mock('drizzle-orm', async (importOriginal) => {
  const original = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...original,
    or: (...args: any[]) => {
      if ((globalThis as any).mockOrUndefined) {
        return undefined as any;
      }
      return original.or(...args);
    },
  };
});

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let dbMock: any;
  let txMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const mocks = createMockDb();
    txMock = mocks.txMock;
    dbMock = mocks.dbMock;

    service = new WorkspacesService(dbMock);
  });

  describe('list', () => {
    it('Should return sorted and paginated workspaces for a user', async () => {
      dbMock.select = vi
        .fn()
        // 1. rows select
        .mockReturnValueOnce(
          createMockQuery([
            {
              id: 'ws-1',
              slug: 'ws-slug-1',
              name: 'Workspace 1',
              ownerUserId: 'user-1',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              role: 'member',
            },
          ]),
        )
        // 2. totals count select
        .mockReturnValueOnce(createMockQuery([{ count: 1 }]));

      const result = await service.list('user-1', {
        sort: 'name',
        order: 'asc',
        limit: 10,
        offset: 0,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0]!.id).toBe('ws-1');
    });

    it('Should return sorted workspaces falling back to createdAt and desc order', async () => {
      dbMock.select = vi
        .fn()
        // 1. rows select
        .mockReturnValueOnce(
          createMockQuery([
            {
              id: 'ws-1',
              slug: 'ws-slug-1',
              name: 'Workspace 1',
              ownerUserId: 'user-1',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              role: 'member',
            },
          ]),
        )
        // 2. totals count select
        .mockReturnValueOnce(createMockQuery([{ count: 1 }]));

      const result = await service.list('user-1', {
        sort: 'createdAt',
        order: 'desc',
        limit: 10,
        offset: 0,
      });

      expect(result.items).toHaveLength(1);
    });

    it('Should return total as 0 when totals count select is empty', async () => {
      dbMock.select = vi
        .fn()
        // 1. rows select
        .mockReturnValueOnce(createMockQuery([]))
        // 2. totals count select (empty)
        .mockReturnValueOnce(createMockQuery([]));

      const result = await service.list('user-1', {
        limit: 10,
        offset: 0,
      } as any);

      expect(result.total).toBe(0);
    });
  });

  describe('get', () => {
    it('Should retrieve workspace by id', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        slug: 'slug-1',
        name: 'Workspace Name',
        ownerUserId: 'user-1',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      dbMock.select.mockReturnValueOnce(
        createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]),
      );

      const result = await service.get('user-1', 'ws-1');

      expect(result.id).toBe('ws-1');
      expect(result.role).toBe('admin');
    });

    it('Should throw NotFoundException if user is not member of the workspace', async () => {
      dbMock.select.mockReturnValueOnce(createMockQuery([]));

      await expect(service.get('user-1', 'ws-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMembers', () => {
    it('Should list workspace members', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'user-1' };
      dbMock.select = vi
        .fn()
        // 1. requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'member' }]))
        // 2. members select
        .mockReturnValueOnce(
          createMockQuery([
            {
              id: 'member-1',
              userId: 'user-1',
              role: 'admin',
              status: 'active',
              displayName: 'John',
              email: 'john@example.com',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        );

      const result = await service.listMembers('user-1', 'ws-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.isOwner).toBe(true);
    });
  });

  describe('listMembersPage', () => {
    const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
    const memberRow = {
      id: 'member-1',
      userId: 'user-1',
      role: 'admin',
      status: 'active',
      displayName: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
    };

    it('Should return paginated members with search and role sort order asc', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'member' }]))
        // 2. rows select
        .mockReturnValueOnce(createMockQuery([memberRow]))
        // 3. totals select
        .mockReturnValueOnce(createMockQuery([{ count: 1 }]));

      const result = await service.listMembersPage('user-1', 'ws-1', {
        limit: 10,
        offset: 0,
        q: 'alice',
        sort: 'role',
        order: 'asc',
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
      expect(result.items[0]!.userId).toBe('user-1');
    });

    it('Should handle name sort and order desc when query q is undefined', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'member' }]))
        // 2. rows select
        .mockReturnValueOnce(createMockQuery([memberRow]))
        // 3. totals select
        .mockReturnValueOnce(createMockQuery([{ count: 1 }]));

      const result = await service.listMembersPage('user-1', 'ws-1', {
        limit: 10,
        offset: 0,
        sort: 'name',
        order: 'desc',
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('Should handle joined sort and empty query string (whitespace)', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'member' }]))
        // 2. rows select
        .mockReturnValueOnce(createMockQuery([memberRow]))
        // 3. totals select
        .mockReturnValueOnce(createMockQuery([{ count: 1 }]));

      const result = await service.listMembersPage('user-1', 'ws-1', {
        limit: 10,
        offset: 0,
        q: '   ',
        sort: 'joined',
        order: 'asc',
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('Should fall back to 0 when totals array is empty', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'member' }]))
        // 2. rows select
        .mockReturnValueOnce(createMockQuery([]))
        // 3. totals select (empty)
        .mockReturnValueOnce(createMockQuery([]));

      const result = await service.listMembersPage('user-1', 'ws-1', {
        limit: 10,
        offset: 0,
      } as any);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('listAddableStaff', () => {
    it('Should list eligible staff users not already in the workspace', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'user-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin -> requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. subquery select
        .mockReturnValueOnce(createMockQuery([{ id: 'user-1' }]))
        // 3. staff users select
        .mockReturnValueOnce(
          createMockQuery([{ id: 'user-2', displayName: 'Staff 1', email: 'staff@example.com' }]),
        );

      const result = await service.listAddableStaff('user-1', 'ws-1', { q: 'staff' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.displayName).toBe('Staff 1');
    });

    it('Should throw ForbiddenException if caller is not an admin when listing addable staff', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'user-1' };
      dbMock.select.mockReturnValueOnce(
        createMockQuery([{ workspace: mockWorkspace, role: 'member' }]),
      );

      await expect(service.listAddableStaff('user-1', 'ws-1', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Should list eligible staff users when query string q is undefined', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'user-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin -> requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. subquery select
        .mockReturnValueOnce(createMockQuery([{ id: 'user-1' }]))
        // 3. staff users select
        .mockReturnValueOnce(
          createMockQuery([{ id: 'user-2', displayName: 'Staff 1', email: 'staff@example.com' }]),
        );

      const result = await service.listAddableStaff('user-1', 'ws-1', {});

      expect(result.items).toHaveLength(1);
    });

    it('Should list eligible staff users but skips search conditions when search expression is falsy', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'user-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin -> requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. subquery select
        .mockReturnValueOnce(createMockQuery([{ id: 'user-1' }]))
        // 3. staff users select
        .mockReturnValueOnce(
          createMockQuery([{ id: 'user-2', displayName: 'Staff 1', email: 'staff@example.com' }]),
        );

      (globalThis as any).mockOrUndefined = true;
      try {
        const result = await service.listAddableStaff('user-1', 'ws-1', { q: 'staff' });
        expect(result.items).toHaveLength(1);
      } finally {
        (globalThis as any).mockOrUndefined = false;
      }
    });
  });

  describe('addMember', () => {
    it('Should successfully add an eligible staff user to the workspace', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. target staff check
        .mockReturnValueOnce(
          createMockQuery([
            { id: 'user-2', displayName: 'Staff 2', email: 'staff2@example.com', roles: ['staff'] },
          ]),
        )
        // 3. existing membership check (not found)
        .mockReturnValueOnce(createMockQuery([]));

      dbMock.returning.mockResolvedValueOnce([
        {
          id: 'member-2',
          userId: 'user-2',
          role: 'member',
          status: 'active',
          createdAt: new Date('2026-07-12T00:00:00.000Z'),
        },
      ]);

      const result = await service.addMember('owner-1', 'ws-1', {
        userId: 'user-2',
        role: 'member',
      });

      expect(dbMock.insert).toHaveBeenCalledWith(workspaceMembers);
      expect(result.id).toBe('member-2');
      expect(result.displayName).toBe('Staff 2');
    });

    it('Should throw UnprocessableEntityException if target is not a staff member', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. target staff check (roles don't match)
        .mockReturnValueOnce(
          createMockQuery([
            { id: 'user-2', displayName: 'Regular', email: 'reg@example.com', roles: ['citizen'] },
          ]),
        );

      await expect(
        service.addMember('owner-1', 'ws-1', { userId: 'user-2', role: 'member' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('Should throw ConflictException if user is already a member', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. target staff check
        .mockReturnValueOnce(
          createMockQuery([
            { id: 'user-2', displayName: 'Staff 2', email: 'staff2@example.com', roles: ['staff'] },
          ]),
        )
        // 3. existing membership check (found)
        .mockReturnValueOnce(createMockQuery([{ id: 'member-2' }]));

      await expect(
        service.addMember('owner-1', 'ws-1', { userId: 'user-2', role: 'member' }),
      ).rejects.toThrow(ConflictException);
    });

    it('Should throw ConflictException if insert fails with Postgres unique violation (code 23505)', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. target staff check
        .mockReturnValueOnce(
          createMockQuery([
            { id: 'user-2', displayName: 'Staff 2', email: 'staff2@example.com', roles: ['staff'] },
          ]),
        )
        // 3. existing membership check (not found)
        .mockReturnValueOnce(createMockQuery([]));

      dbMock.returning.mockRejectedValueOnce(
        Object.assign(new Error('Unique violation'), { code: '23505' }),
      );

      await expect(
        service.addMember('owner-1', 'ws-1', { userId: 'user-2', role: 'member' }),
      ).rejects.toThrow(ConflictException);
    });

    it('Should rethrow error if insert fails with a different error', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. target staff check
        .mockReturnValueOnce(
          createMockQuery([
            { id: 'user-2', displayName: 'Staff 2', email: 'staff2@example.com', roles: ['staff'] },
          ]),
        )
        // 3. existing membership check (not found)
        .mockReturnValueOnce(createMockQuery([]));

      dbMock.returning.mockRejectedValueOnce(new Error('Some DB connection error'));

      await expect(
        service.addMember('owner-1', 'ws-1', { userId: 'user-2', role: 'member' }),
      ).rejects.toThrow('Some DB connection error');
    });

    it('Should throw Error if insert returns no row', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. target staff check
        .mockReturnValueOnce(
          createMockQuery([
            { id: 'user-2', displayName: 'Staff 2', email: 'staff2@example.com', roles: ['staff'] },
          ]),
        )
        // 3. existing membership check (not found)
        .mockReturnValueOnce(createMockQuery([]));

      dbMock.returning.mockResolvedValueOnce([]); // empty returning

      await expect(
        service.addMember('owner-1', 'ws-1', { userId: 'user-2', role: 'member' }),
      ).rejects.toThrow('member insert returned no row');
    });
  });

  describe('updateMember', () => {
    it('Should successfully update role/status of a member', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. member query
        .mockReturnValueOnce(
          createMockQuery([{ id: 'member-2', userId: 'user-2', role: 'member', status: 'active' }]),
        );

      await service.updateMember('owner-1', 'ws-1', 'member-2', { role: 'admin' });

      expect(dbMock.update).toHaveBeenCalledWith(workspaceMembers);
    });

    it('Should throw ForbiddenException if trying to update the owner', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. member query (is owner)
        .mockReturnValueOnce(
          createMockQuery([{ id: 'member-1', userId: 'owner-1', role: 'admin', status: 'active' }]),
        );

      await expect(
        service.updateMember('owner-1', 'ws-1', 'member-1', { status: 'suspended' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Should throw ConflictException if trying to demote the last active admin', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. member query (is active admin)
        .mockReturnValueOnce(
          createMockQuery([{ id: 'member-2', userId: 'admin-2', role: 'admin', status: 'active' }]),
        )
        // 3. active admins count (only 1)
        .mockReturnValueOnce(createMockQuery([{ n: 1 }]));

      await expect(
        service.updateMember('owner-1', 'ws-1', 'member-2', { role: 'member' }),
      ).rejects.toThrow(ConflictException);
    });

    it('Should successfully demote active admin if other active admins exist', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. member query (is active admin)
        .mockReturnValueOnce(
          createMockQuery([{ id: 'member-2', userId: 'admin-2', role: 'admin', status: 'active' }]),
        )
        // 3. active admins count (2 exists)
        .mockReturnValueOnce(createMockQuery([{ n: 2 }]));

      await service.updateMember('owner-1', 'ws-1', 'member-2', { role: 'member' });

      expect(dbMock.update).toHaveBeenCalledWith(workspaceMembers);
    });

    it('Should successfully update status and fall back to target role when role is omitted', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. member query
        .mockReturnValueOnce(
          createMockQuery([{ id: 'member-2', userId: 'user-2', role: 'member', status: 'active' }]),
        );

      await service.updateMember('owner-1', 'ws-1', 'member-2', { status: 'suspended' });

      expect(dbMock.update).toHaveBeenCalledWith(workspaceMembers);
    });

    it('Should throw ConflictException if demoting last active admin when counts query returns empty', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. member query (is active admin)
        .mockReturnValueOnce(
          createMockQuery([{ id: 'member-2', userId: 'admin-2', role: 'admin', status: 'active' }]),
        )
        // 3. active admins count (empty result)
        .mockReturnValueOnce(createMockQuery([]));

      await expect(
        service.updateMember('owner-1', 'ws-1', 'member-2', { role: 'member' }),
      ).rejects.toThrow(ConflictException);
    });

    it('Should throw NotFoundException if member to update is not found', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireAdmin
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. member query (not found)
        .mockReturnValueOnce(createMockQuery([]));

      await expect(
        service.updateMember('owner-1', 'ws-1', 'nonexistent-member', { role: 'admin' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBySlug', () => {
    it('Should retrieve workspace by slug', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        slug: 'my-slug',
        name: 'Workspace Name',
        ownerUserId: 'user-1',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      dbMock.select.mockReturnValueOnce(
        createMockQuery([{ workspace: mockWorkspace, role: 'member' }]),
      );

      const result = await service.getBySlug('user-1', 'my-slug');

      expect(result.id).toBe('ws-1');
    });

    it('Should throw NotFoundException if slug not found or user is not a member', async () => {
      dbMock.select.mockReturnValueOnce(createMockQuery([]));

      await expect(service.getBySlug('user-1', 'my-slug')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('Should create workspace and creator admin membership in transaction', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        slug: 'slug-1',
        name: 'New WS',
        ownerUserId: 'user-1',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      txMock.returning.mockResolvedValueOnce([mockWorkspace]);

      const result = await service.create('user-1', { name: 'New WS' });

      expect(txMock.insert).toHaveBeenNthCalledWith(1, workspaces);
      expect(txMock.insert).toHaveBeenNthCalledWith(2, workspaceMembers);
      expect(result.id).toBe('ws-1');
    });

    it('Should throw Error if workspace insert returns no row', async () => {
      txMock.returning.mockResolvedValueOnce([]); // empty returning

      await expect(service.create('user-1', { name: 'New WS' })).rejects.toThrow(
        'workspace insert returned no row',
      );
    });
  });

  describe('update', () => {
    it('Should update workspace name', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'user-1' };
      const updatedWorkspace = {
        id: 'ws-1',
        slug: 'slug-1',
        name: 'Updated WS',
        ownerUserId: 'user-1',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      dbMock.select.mockReturnValueOnce(
        createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]),
      ); // requireAdmin
      dbMock.returning.mockResolvedValueOnce([updatedWorkspace]);

      const result = await service.update('user-1', 'ws-1', { name: 'Updated WS' });

      expect(dbMock.update).toHaveBeenCalledWith(workspaces);
      expect(result.name).toBe('Updated WS');
    });

    it('Should throw NotFoundException if update returns no row', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'user-1' };
      dbMock.select.mockReturnValueOnce(
        createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]),
      ); // requireAdmin
      dbMock.returning.mockResolvedValueOnce([]); // empty returning

      await expect(service.update('user-1', 'ws-1', { name: 'Updated WS' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('Should delete workspace document', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'user-1' };
      dbMock.select.mockReturnValueOnce(
        createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]),
      ); // requireAdmin

      await service.remove('user-1', 'ws-1');

      expect(dbMock.delete).toHaveBeenCalledWith(workspaces);
    });
  });

  describe('transferOwnership', () => {
    it('Should transfer ownership and promote target user to active admin', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. target membership search (is active)
        .mockReturnValueOnce(createMockQuery([{ id: 'member-2', status: 'active' }]));

      const updatedWorkspace = {
        id: 'ws-1',
        slug: 'slug-1',
        name: 'WS Name',
        ownerUserId: 'user-2',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };
      txMock.returning.mockResolvedValueOnce([updatedWorkspace]);

      const result = await service.transferOwnership('owner-1', 'ws-1', { userId: 'user-2' });

      expect(txMock.update).toHaveBeenNthCalledWith(1, workspaceMembers);
      expect(txMock.update).toHaveBeenNthCalledWith(2, workspaces);
      expect(result.ownerId).toBe('user-2');
    });

    it('Should throw ForbiddenException if caller is not the owner', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'different-owner' };
      dbMock.select.mockReturnValueOnce(
        createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]),
      );

      await expect(
        service.transferOwnership('caller-1', 'ws-1', { userId: 'user-2' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Should throw UnprocessableEntityException if target is not active member', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. target membership search (is suspended)
        .mockReturnValueOnce(createMockQuery([{ id: 'member-2', status: 'suspended' }]));

      await expect(
        service.transferOwnership('owner-1', 'ws-1', { userId: 'user-2' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('Should throw Error if workspace update returns no row during transfer', async () => {
      const mockWorkspace = { id: 'ws-1', ownerUserId: 'owner-1' };
      dbMock.select = vi
        .fn()
        // 1. requireMembership
        .mockReturnValueOnce(createMockQuery([{ workspace: mockWorkspace, role: 'admin' }]))
        // 2. target membership search (is active)
        .mockReturnValueOnce(createMockQuery([{ id: 'member-2', status: 'active' }]));

      txMock.returning.mockResolvedValueOnce([]); // empty returning

      await expect(
        service.transferOwnership('owner-1', 'ws-1', { userId: 'user-2' }),
      ).rejects.toThrow('workspace update returned no row');
    });
  });
});
