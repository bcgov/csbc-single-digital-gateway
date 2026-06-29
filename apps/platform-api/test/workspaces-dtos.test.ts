import { describe, expect, it } from 'vitest';
import {
  addMemberSchema,
  addableStaffQuerySchema,
  createWorkspaceSchema,
  listWorkspacesQuerySchema,
  transferOwnershipSchema,
  updateWorkspaceSchema,
} from '../src/modules/workspaces/dtos/workspace.dtos';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('workspace DTO schemas', () => {
  describe('createWorkspaceSchema', () => {
    it('accepts a valid name', () => {
      expect(createWorkspaceSchema.parse({ name: 'City of Riverton' })).toEqual({
        name: 'City of Riverton',
      });
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
    it('accepts a valid name and rejects an empty one', () => {
      expect(updateWorkspaceSchema.parse({ name: 'Renamed' })).toEqual({ name: 'Renamed' });
      expect(updateWorkspaceSchema.safeParse({ name: '' }).success).toBe(false);
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
    it('accepts an optional, trimmed q', () => {
      expect(addableStaffQuerySchema.parse({})).toEqual({});
      expect(addableStaffQuerySchema.parse({ q: '  ann ' })).toEqual({ q: 'ann' });
    });

    it('rejects a q longer than 255 chars', () => {
      expect(addableStaffQuerySchema.safeParse({ q: 'a'.repeat(256) }).success).toBe(false);
    });
  });

  describe('listWorkspacesQuerySchema', () => {
    it('applies sensible defaults', () => {
      expect(listWorkspacesQuerySchema.parse({})).toEqual({
        sort: 'name',
        order: 'asc',
        limit: 20,
        offset: 0,
      });
    });

    it('coerces numeric strings from the query string', () => {
      expect(listWorkspacesQuerySchema.parse({ limit: '50', offset: '10' })).toMatchObject({
        limit: 50,
        offset: 10,
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
});
