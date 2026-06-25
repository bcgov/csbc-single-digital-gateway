import { describe, expect, it } from 'vitest';
import {
  createWorkspaceSchema,
  listWorkspacesQuerySchema,
  updateWorkspaceSchema,
} from '../src/modules/workspaces/dtos/workspace.dtos';

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
