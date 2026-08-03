import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import {
  workspacesQueryOptions,
  newestWorkspaceQueryOptions,
  useWorkspaces,
  workspaceBySlugQueryOptions,
  workspaceMembersQueryOptions,
  workspaceAddableStaffQueryOptions,
  addWorkspaceMember,
  updateWorkspaceMember,
  transferWorkspaceOwnership,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from '@/lib/workspaces';

// Mock TanStack query and BFF
vi.mock('@tanstack/react-query', () => ({
  queryOptions: vi.fn((opts) => opts),
  useQuery: vi.fn(),
}));

vi.mock('@/lib/bff', () => ({
  BFF_ORIGIN: 'http://bff-test',
}));

const mockResponse = (status: number, data: any, okState = true) => {
  return {
    ok: okState,
    status,
    json: () => Promise.resolve(data),
  } as Response;
};

describe('Workspaces Unit Test Suite', () => {
  const mockFetch = vi.fn();
  globalThis.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(useQuery).mockReset();
  });

  describe('workspacesQueryOptions', () => {
    it('should return workspaces list query options', async () => {
      const opts = workspacesQueryOptions();
      expect(opts.queryKey).toEqual(['workspaces', 'list']);
      expect(opts.staleTime).toBe(60 * 1000);

      const mockData = {
        items: [
          {
            id: 'w-1',
            name: 'Workspace 1',
            slug: 'w1',
            role: 'admin',
            ownerId: 'u-1',
            createdAt: '2026',
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      };
      mockFetch.mockResolvedValueOnce(mockResponse(200, mockData));

      const res = await (opts.queryFn as any)();
      expect(res).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/workspaces?sort=name&order=asc&limit=100',
        {
          credentials: 'include',
        },
      );
    });

    it('should throw if workspaces list fetch fails', async () => {
      const opts = workspacesQueryOptions();
      mockFetch.mockResolvedValueOnce(mockResponse(500, null, false));

      await expect((opts.queryFn as any)().catch((e: any) => e.message)).resolves.toContain(
        'GET /v1/workspaces failed: 500',
      );
    });
  });

  describe('newestWorkspaceQueryOptions', () => {
    it('should return newest workspace query options and return the first item', async () => {
      const opts = newestWorkspaceQueryOptions();
      expect(opts.queryKey).toEqual(['workspaces', 'newest']);
      expect(opts.staleTime).toBe(60 * 1000);

      const mockWorkspace = {
        id: 'w-1',
        name: 'Workspace 1',
        slug: 'w1',
        role: 'admin',
        ownerId: 'u-1',
        createdAt: '2026',
      };
      const mockData = {
        items: [mockWorkspace],
        total: 1,
        limit: 1,
        offset: 0,
      };
      mockFetch.mockResolvedValueOnce(mockResponse(200, mockData));

      const res = await (opts.queryFn as any)();
      expect(res).toEqual(mockWorkspace);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/workspaces?sort=createdAt&order=desc&limit=1',
        {
          credentials: 'include',
        },
      );
    });

    it('should return null if there is no newest workspace', async () => {
      const opts = newestWorkspaceQueryOptions();
      const mockData = {
        items: [],
        total: 0,
        limit: 1,
        offset: 0,
      };
      mockFetch.mockResolvedValueOnce(mockResponse(200, mockData));

      const res = await (opts.queryFn as any)();
      expect(res).toBeNull();
    });
  });

  describe('useWorkspaces', () => {
    it('should invoke useQuery with workspaces list options and select selector', () => {
      useWorkspaces();
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['workspaces', 'list'],
        }),
      );

      const callArgs = vi.mocked(useQuery).mock.calls[0]?.[0] as any;
      expect(callArgs).toBeDefined();
      expect(typeof callArgs.select).toBe('function');

      const mockEnvelope = {
        items: [{ id: 'w-1', name: 'Workspace 1' }],
        total: 1,
        limit: 100,
        offset: 0,
      };
      expect(callArgs.select(mockEnvelope)).toEqual([{ id: 'w-1', name: 'Workspace 1' }]);
    });
  });

  describe('workspaceBySlugQueryOptions', () => {
    it('should return query options and fetch workspace by slug', async () => {
      const opts = workspaceBySlugQueryOptions('my-slug');
      expect(opts.queryKey).toEqual(['workspaces', 'by-slug', 'my-slug']);
      expect(opts.staleTime).toBe(60 * 1000);

      const mockWorkspace = { id: 'w-1', name: 'Workspace 1', slug: 'my-slug' };
      mockFetch.mockResolvedValueOnce(mockResponse(200, mockWorkspace));

      const res = await (opts.queryFn as any)();
      expect(res).toEqual(mockWorkspace);
      expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/workspaces/by-slug/my-slug', {
        credentials: 'include',
      });
    });

    it('should return null if workspace slug is not found (404)', async () => {
      const opts = workspaceBySlugQueryOptions('my-slug');
      mockFetch.mockResolvedValueOnce(mockResponse(404, null, false));

      const res = await (opts.queryFn as any)();
      expect(res).toBeNull();
    });

    it('should throw for non-404 failing status codes', async () => {
      const opts = workspaceBySlugQueryOptions('my-slug');
      mockFetch.mockResolvedValueOnce(mockResponse(500, null, false));

      await expect((opts.queryFn as any)().catch((e: any) => e.message)).resolves.toContain(
        'GET /v1/workspaces/by-slug failed: 500',
      );
    });
  });

  describe('workspaceMembersQueryOptions', () => {
    it('should return query options to list workspace members', async () => {
      const opts = workspaceMembersQueryOptions('ws-id-123');
      expect(opts.queryKey).toEqual(['workspaces', 'members', 'ws-id-123']);
      expect(opts.staleTime).toBe(30 * 1000);

      const mockMembers = [{ id: 'm-1', userId: 'u-1', role: 'admin' }];
      mockFetch.mockResolvedValueOnce(mockResponse(200, { items: mockMembers }));

      const res = await (opts.queryFn as any)();
      expect(res).toEqual(mockMembers);
      expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/workspaces/ws-id-123/members', {
        credentials: 'include',
      });
    });

    it('should throw error when list workspace members fails', async () => {
      const opts = workspaceMembersQueryOptions('ws-id-123');
      mockFetch.mockResolvedValueOnce(mockResponse(500, null, false));

      await expect((opts.queryFn as any)().catch((e: any) => e.message)).resolves.toContain(
        'GET /v1/workspaces/:id/members failed: 500',
      );
    });
  });

  describe('workspaceAddableStaffQueryOptions', () => {
    it('should query addable staff without query term', async () => {
      const opts = workspaceAddableStaffQueryOptions('ws-id-123', '');
      expect(opts.queryKey).toEqual(['workspaces', 'addable-staff', 'ws-id-123', '']);
      expect(opts.staleTime).toBe(30 * 1000);
      expect(typeof opts.placeholderData).toBe('function');
      const placeholderFn = opts.placeholderData as Function;
      expect(placeholderFn('previous')).toBe('previous');

      const mockStaff = [{ id: 's-1', displayName: 'Staff 1' }];
      mockFetch.mockResolvedValueOnce(mockResponse(200, { items: mockStaff }));

      const res = await (opts.queryFn as any)();
      expect(res).toEqual(mockStaff);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/workspaces/ws-id-123/addable-staff',
        {
          credentials: 'include',
        },
      );
    });

    it('should query addable staff with trimmed query term', async () => {
      const opts = workspaceAddableStaffQueryOptions('ws-id-123', '  John Doe  ');
      expect(opts.queryKey).toEqual(['workspaces', 'addable-staff', 'ws-id-123', 'John Doe']);

      mockFetch.mockResolvedValueOnce(mockResponse(200, { items: [] }));

      await (opts.queryFn as any)();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/workspaces/ws-id-123/addable-staff?q=John%20Doe',
        {
          credentials: 'include',
        },
      );
    });

    it('should throw error when staff search fails', async () => {
      const opts = workspaceAddableStaffQueryOptions('ws-id-123', '');
      mockFetch.mockResolvedValueOnce(mockResponse(500, null, false));

      await expect((opts.queryFn as any)().catch((e: any) => e.message)).resolves.toContain(
        'GET /v1/workspaces/:id/addable-staff failed: 500',
      );
    });
  });

  describe('addWorkspaceMember', () => {
    it('should call POST to add a workspace member', async () => {
      const mockMember = { id: 'm-1', userId: 'u-1', role: 'admin' };
      mockFetch.mockResolvedValueOnce(mockResponse(200, mockMember));

      const res = await addWorkspaceMember('ws-id-123', { userId: 'u-1', role: 'admin' });
      expect(res).toEqual(mockMember);
      expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/workspaces/ws-id-123/members', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 'u-1', role: 'admin' }),
      });
    });

    it('should throw when adding member fails', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(400, null, false));

      await expect(
        addWorkspaceMember('ws-id-123', { userId: 'u-1', role: 'admin' }).catch(
          (e: any) => e.message,
        ),
      ).resolves.toContain('POST /v1/workspaces/:id/members failed: 400');
    });
  });

  describe('updateWorkspaceMember', () => {
    it('should call PATCH to update workspace member details', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, null));

      await updateWorkspaceMember('ws-id-123', 'mem-id-456', {
        role: 'member',
        status: 'suspended',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/workspaces/ws-id-123/members/mem-id-456',
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ role: 'member', status: 'suspended' }),
        },
      );
    });

    it('should throw when updating member fails', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500, null, false));

      await expect(
        updateWorkspaceMember('ws-id-123', 'mem-id-456', { role: 'member' }).catch(
          (e: any) => e.message,
        ),
      ).resolves.toContain('PATCH /v1/workspaces/:id/members/:memberId failed: 500');
    });
  });

  describe('transferWorkspaceOwnership', () => {
    it('should call POST to transfer workspace ownership', async () => {
      const mockWorkspace = { id: 'ws-id-123', ownerId: 'u-2' };
      mockFetch.mockResolvedValueOnce(mockResponse(200, mockWorkspace));

      const res = await transferWorkspaceOwnership('ws-id-123', 'u-2');
      expect(res).toEqual(mockWorkspace);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/workspaces/ws-id-123/transfer-ownership',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId: 'u-2' }),
        },
      );
    });

    it('should throw when transferring ownership fails', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(403, null, false));

      await expect(
        transferWorkspaceOwnership('ws-id-123', 'u-2').catch((e: any) => e.message),
      ).resolves.toContain('POST /v1/workspaces/:id/transfer-ownership failed: 403');
    });
  });

  describe('createWorkspace', () => {
    it('should call POST to create a workspace', async () => {
      const mockWorkspace = { id: 'ws-id-123', name: 'New WS' };
      mockFetch.mockResolvedValueOnce(mockResponse(200, mockWorkspace));

      const res = await createWorkspace('New WS');
      expect(res).toEqual(mockWorkspace);
      expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/workspaces', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'New WS' }),
      });
    });

    it('should throw when creating workspace fails', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500, null, false));

      await expect(createWorkspace('New WS').catch((e: any) => e.message)).resolves.toContain(
        'POST /v1/workspaces failed: 500',
      );
    });
  });

  describe('updateWorkspace', () => {
    it('should call PATCH to rename a workspace', async () => {
      const mockWorkspace = { id: 'ws-id-123', name: 'Updated Name' };
      mockFetch.mockResolvedValueOnce(mockResponse(200, mockWorkspace));

      const res = await updateWorkspace('ws-id-123', 'Updated Name');
      expect(res).toEqual(mockWorkspace);
      expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/workspaces/ws-id-123', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
    });

    it('should throw when renaming workspace fails', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500, null, false));

      await expect(
        updateWorkspace('ws-id-123', 'Updated Name').catch((e: any) => e.message),
      ).resolves.toContain('PATCH /v1/workspaces failed: 500');
    });
  });

  describe('deleteWorkspace', () => {
    it('should call DELETE to delete a workspace', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, null));

      await deleteWorkspace('ws-id-123');
      expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/workspaces/ws-id-123', {
        method: 'DELETE',
        credentials: 'include',
      });
    });

    it('should throw when deleting workspace fails', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500, null, false));

      await expect(deleteWorkspace('ws-id-123').catch((e: any) => e.message)).resolves.toContain(
        'DELETE /v1/workspaces failed: 500',
      );
    });
  });
});
