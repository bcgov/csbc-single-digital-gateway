import { describe, expect, it } from 'vitest';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  listWorkspacesQuerySchema,
  updateMemberSchema,
  transferOwnershipSchema,
  addMemberSchema,
  addableStaffQuerySchema,
  toStaffUserDto,
  toWorkspaceMemberDto,
  toWorkspaceDto,
} from '../../../../../src/modules/workspaces/dtos/workspace.dtos';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('workspace DTO schemas and helpers', () => {
  describe('createWorkspaceSchema', () => {
    it('accepts a valid name', () => {
      expect(createWorkspaceSchema.parse({ name: 'City of Riverton' })).toEqual({
        name: 'City of Riverton',
      });
    });

    it('accepts a valid name and rejects empty or too long names', () => {
      expect(createWorkspaceSchema.safeParse({ name: 'Riverton' }).success).toBe(true);
      expect(createWorkspaceSchema.safeParse({ name: '' }).success).toBe(false);
      expect(createWorkspaceSchema.safeParse({ name: 'a'.repeat(256) }).success).toBe(false);
    });

    it('rejects a missing or empty name', () => {
      expect(createWorkspaceSchema.safeParse({}).success).toBe(false);
      expect(createWorkspaceSchema.safeParse({ name: '' }).success).toBe(false);
      expect(createWorkspaceSchema.safeParse({ name: '   ' }).success).toBe(false);
    });

    it('rejects a name longer than 255 chars', () => {
      expect(createWorkspaceSchema.safeParse({ name: 'a'.repeat(256) }).success).toBe(false);
    });

    it('strips unknown keys like a client-sent slug', () => {
      const parsed = createWorkspaceSchema.parse({ name: 'Riverton', slug: 'hacked' });
      expect(parsed).not.toHaveProperty('slug');
    });
  });

  describe('updateWorkspaceSchema', () => {
    it('accepts a valid name and rejects empty names', () => {
      expect(updateWorkspaceSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
      expect(updateWorkspaceSchema.safeParse({ name: '' }).success).toBe(false);
    });
  });

  describe('listWorkspacesQuerySchema', () => {
    it('applies defaults and coerces numeric queries', () => {
      const parsed = listWorkspacesQuerySchema.parse({ limit: '30', offset: '5' });
      expect(parsed).toEqual({
        sort: 'name',
        order: 'asc',
        limit: 30,
        offset: 5,
      });
    });

    it('accepts createdAt desc', () => {
      expect(listWorkspacesQuerySchema.parse({ sort: 'createdAt', order: 'desc' })).toMatchObject({
        sort: 'createdAt',
        order: 'desc',
      });
    });

    it('rejects out-of-range and unknown values', () => {
      expect(listWorkspacesQuerySchema.safeParse({ sort: 'bogus' }).success).toBe(false);
      expect(listWorkspacesQuerySchema.safeParse({ order: 'sideways' }).success).toBe(false);
      expect(listWorkspacesQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(listWorkspacesQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
      expect(listWorkspacesQuerySchema.safeParse({ offset: -1 }).success).toBe(false);
    });
  });

  describe('updateMemberSchema', () => {
    it('accepts a valid name and rejects an empty one', () => {
      expect(updateWorkspaceSchema.parse({ name: 'Renamed' })).toEqual({ name: 'Renamed' });
      expect(updateWorkspaceSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('accepts role, status, or both', () => {
      expect(updateMemberSchema.safeParse({ role: 'admin' }).success).toBe(true);
      expect(updateMemberSchema.safeParse({ status: 'suspended' }).success).toBe(true);
      expect(updateMemberSchema.safeParse({ role: 'member', status: 'active' }).success).toBe(true);
    });

    it('rejects if both role and status are missing', () => {
      expect(updateMemberSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('transferOwnershipSchema', () => {
    it('accepts a valid uuid userId', () => {
      const id = '11111111-1111-4111-8111-111111111111';
      expect(transferOwnershipSchema.parse({ userId: id })).toEqual({ userId: id });
    });

    it('rejects a missing or non-uuid userId', () => {
      expect(transferOwnershipSchema.safeParse({}).success).toBe(false);
      expect(transferOwnershipSchema.safeParse({ userId: 'not-a-uuid' }).success).toBe(false);
      expect(transferOwnershipSchema.safeParse({ userId: '' }).success).toBe(false);
    });

    it('strips unknown keys', () => {
      const id = '22222222-2222-4222-8222-222222222222';
      expect(transferOwnershipSchema.parse({ userId: id, role: 'admin' })).not.toHaveProperty(
        'role',
      );
    });
  });

  describe('addMemberSchema', () => {
    it('requires a valid role and uuid userId', () => {
      expect(addMemberSchema.safeParse({ userId: UUID, role: 'admin' }).success).toBe(true);
      expect(addMemberSchema.safeParse({ userId: UUID, role: 'invalid' }).success).toBe(false);
    });

    it('accepts a valid userId with admin or member role', () => {
      expect(addMemberSchema.parse({ userId: UUID, role: 'member' })).toEqual({
        userId: UUID,
        role: 'member',
      });
      expect(addMemberSchema.parse({ userId: UUID, role: 'admin' })).toEqual({
        userId: UUID,
        role: 'admin',
      });
    });

    it('rejects a bad userId, missing role, or unknown role', () => {
      expect(addMemberSchema.safeParse({ userId: 'nope', role: 'member' }).success).toBe(false);
      expect(addMemberSchema.safeParse({ userId: UUID }).success).toBe(false);
      expect(addMemberSchema.safeParse({ userId: UUID, role: 'owner' }).success).toBe(false);
    });
  });

  describe('addableStaffQuerySchema', () => {
    it('accepts optional, trimmed query strings', () => {
      expect(addableStaffQuerySchema.parse({ q: ' search ' })).toEqual({ q: 'search' });
    });

    it('accepts an optional, trimmed q', () => {
      expect(addableStaffQuerySchema.parse({})).toEqual({});
      expect(addableStaffQuerySchema.parse({ q: '  ann ' })).toEqual({ q: 'ann' });
    });

    it('rejects a q longer than 255 chars', () => {
      expect(addableStaffQuerySchema.safeParse({ q: 'a'.repeat(256) }).success).toBe(false);
    });
  });

  describe('mapping helpers', () => {
    it('toStaffUserDto maps fields correctly', () => {
      const row = { id: 'user-1', displayName: 'John', email: 'john@example.com' };
      const dto = toStaffUserDto(row);
      expect(dto).toEqual({ id: 'user-1', displayName: 'John', email: 'john@example.com' });
    });

    it('toWorkspaceMemberDto maps member rows and identifies owner', () => {
      const row = {
        id: 'member-1',
        userId: 'user-1',
        role: 'admin' as const,
        status: 'active' as const,
        displayName: 'John',
        email: 'john@example.com',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      const memberDto = toWorkspaceMemberDto(row, 'user-1'); // matches ownerId
      expect(memberDto.isOwner).toBe(true);
      expect(memberDto.joinedAt).toBe('2026-07-12T00:00:00.000Z');

      const nonOwnerDto = toWorkspaceMemberDto(row, 'user-different');
      expect(nonOwnerDto.isOwner).toBe(false);
    });

    it('toWorkspaceDto maps workspace rows correctly', () => {
      const row = {
        id: 'ws-1',
        slug: 'slug-1',
        name: 'Workspace Name',
        ownerUserId: 'user-1',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      const dto = toWorkspaceDto(row, 'member');
      expect(dto).toEqual({
        id: 'ws-1',
        slug: 'slug-1',
        name: 'Workspace Name',
        role: 'member',
        ownerId: 'user-1',
        createdAt: '2026-07-12T00:00:00.000Z',
      });
    });
  });

  describe('listMembersQuerySchema', () => {
    it('defaults to the admins-first (role) sort and coerces paging', () => {
      expect(listMembersQuerySchema.parse({})).toEqual({
        sort: 'role',
        order: 'asc',
        limit: 20,
        offset: 0,
      });
      expect(listMembersQuerySchema.parse({ limit: '50', offset: '10' })).toMatchObject({
        limit: 50,
        offset: 10,
      });
    });

    it('accepts name/joined sorts + a q, rejects unknown sort/order and out-of-range paging', () => {
      expect(listMembersQuerySchema.safeParse({ sort: 'name', q: 'ann' }).success).toBe(true);
      expect(listMembersQuerySchema.safeParse({ sort: 'joined' }).success).toBe(true);
      expect(listMembersQuerySchema.safeParse({ sort: 'bogus' }).success).toBe(false);
      expect(listMembersQuerySchema.safeParse({ order: 'sideways' }).success).toBe(false);
      expect(listMembersQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(listMembersQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    });
  });
});
