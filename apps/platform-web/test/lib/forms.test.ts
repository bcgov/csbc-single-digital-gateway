import { describe, expect, it, vi, beforeEach } from 'vitest';
import { formQueryOptions, updateFormSchema } from '@/lib/forms';

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

describe('Forms API client', () => {
  const mockFetch = vi.fn();
  globalThis.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('queries form details with query options', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, {
        form: { id: 'frm-1', title: 'Application Form' },
        version: { id: 'v-1' },
      }),
    );

    const options = formQueryOptions('frm-1');
    expect(options.queryKey).toEqual(['forms', 'detail', 'frm-1']);

    const details = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/forms/frm-1', {
      credentials: 'include',
    });
    expect(details.form.title).toBe('Application Form');
  });

  it('updates form schema definition and optional title', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'v-1', schema: { type: 'object' } }));

    const updateInput = {
      definition: { schema: { type: 'object' }, uischema: {} },
      title: 'New Title',
    };

    const res = await updateFormSchema('frm-1', 'v-1', updateInput);
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/forms/frm-1/versions/v-1', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(updateInput),
    });
    expect(res.schema).toEqual({ type: 'object' });
  });

  it('handles error message body on failed responses', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(400, { message: 'Invalid JSON Schema payload' }, false),
    );

    const options = formQueryOptions('frm-1');
    await expect((options.queryFn as any)()).rejects.toThrow('Invalid JSON Schema payload');
  });

  it('falls back to default HTTP status text message on failure without body details', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, null, false));

    const options = formQueryOptions('frm-1');
    await expect((options.queryFn as any)()).rejects.toThrow('Request failed: 500');
  });
});
