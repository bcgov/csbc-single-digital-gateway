import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  adminDocumentTypesQueryOptions,
  adminDocumentTypeQueryOptions,
  addVersion,
  editDraft,
  deleteDraft,
  publishVersion,
  archiveVersion,
} from '@/lib/document-types';

// Mock BFF origin
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

describe('Admin Document Types API client', () => {
  const mockFetch = vi.fn();
  globalThis.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('queries all document types with query options', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { items: [{ type: { id: 'dt-1', name: 'Form A' }, versions: [] }] }),
    );

    const options = adminDocumentTypesQueryOptions();
    expect(options.queryKey).toEqual(['admin', 'document-types']);

    const items = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/admin/document-types', {
      credentials: 'include',
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.type.name).toBe('Form A');
  });

  it('queries a single document type by id', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { type: { id: 'dt-1', name: 'Form A' }, versions: [] }),
    );

    const options = adminDocumentTypeQueryOptions('dt-1');
    expect(options.queryKey).toEqual(['admin', 'document-types', 'dt-1']);

    const details = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/admin/document-types/dt-1', {
      credentials: 'include',
    });
    expect(details.type.name).toBe('Form A');
  });

  it('handles API error bodies from envelope messages (single and array)', async () => {
    // Test case 1: Single string message
    mockFetch.mockResolvedValue(
      mockResponse(400, { message: 'Database validation failed' }, false),
    );

    const options = adminDocumentTypeQueryOptions('dt-1');
    await expect((options.queryFn as any)()).rejects.toThrow('Database validation failed');

    // Test case 2: Array of messages
    mockFetch.mockResolvedValue(
      mockResponse(400, { message: ['Name is required', 'Kind is invalid'] }, false),
    );

    await expect((options.queryFn as any)()).rejects.toThrow('Name is required, Kind is invalid');
  });

  it('sends POST to add a version', async () => {
    mockFetch.mockResolvedValue(mockResponse(201, { id: 'ver-2', version: 2 }));

    const res = await addVersion('dt-1', { schema: {} });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/admin/document-types/dt-1/versions',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ definition: { schema: {} } }),
      },
    );
    expect(res.version).toBe(2);
  });

  it('sends PATCH to edit a draft version', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'ver-1', version: 1 }));

    const res = await editDraft('dt-1', 'ver-1', { schema: { title: 'Updated' } });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/admin/document-types/dt-1/versions/ver-1',
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ definition: { schema: { title: 'Updated' } } }),
      },
    );
    expect(res.version).toBe(1);
  });

  it('sends DELETE to delete a draft version', async () => {
    mockFetch.mockResolvedValue(mockResponse(204, null));

    await deleteDraft('dt-1', 'ver-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/admin/document-types/dt-1/versions/ver-1',
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );
  });

  it('throws error when deleteDraft request fails', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, null, false));

    await expect(deleteDraft('dt-1', 'ver-1')).rejects.toThrow('Request failed: 500');
  });

  it('sends POST requests to publish and archive versions', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'ver-1', status: 'published' }));

    // Publish
    const pub = await publishVersion('dt-1', 'ver-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/admin/document-types/dt-1/versions/ver-1/publish',
      {
        method: 'POST',
        credentials: 'include',
      },
    );
    expect(pub.status).toBe('published');

    // Archive
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'ver-1', status: 'archived' }));
    const arch = await archiveVersion('dt-1', 'ver-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/admin/document-types/dt-1/versions/ver-1/archive',
      {
        method: 'POST',
        credentials: 'include',
      },
    );
    expect(arch.status).toBe('archived');
  });
});
