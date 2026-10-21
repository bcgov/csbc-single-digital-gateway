import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  agreementsQueryOptions,
  agreementQueryOptions,
  createAgreement,
  updateAgreementDraft,
  addAgreementVersion,
  publishAgreementVersion,
  workspaceDefaultAgreementsQueryOptions,
  addDefaultAgreement,
  removeDefaultAgreement,
} from '@/lib/service-agreements';
import { mockResponse } from '../../support/mock-response';
import { mockFetch } from '../../support/vi-fixtures';

// Mock BFF origin
vi.mock('@/lib/bff', () => ({
  BFF_ORIGIN: 'http://bff-test',
}));

describe('Service Agreements Unit Test Suite', () => {
  globalThis.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('Should query agreements with workspaceId', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { items: [{ id: 'a1', title: 'TOS' }] }));

    const options = agreementsQueryOptions('w1');
    expect(options.queryKey).toEqual(['service-agreements', 'w1']);

    const items = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/service-agreements?workspaceId=w1', {
      credentials: 'include',
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('TOS');
  });

  it('Should query global agreements when workspaceId is null', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { items: [] }));

    const options = agreementsQueryOptions(null);
    expect(options.queryKey).toEqual(['service-agreements', 'global']);

    await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/service-agreements', {
      credentials: 'include',
    });
  });

  it('Should query a single agreement detail by id', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { agreement: { id: 'a1' } }));

    const options = agreementQueryOptions('a1');
    expect(options.queryKey).toEqual(['service-agreements', 'detail', 'a1']);

    const detail = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/service-agreements/a1', {
      credentials: 'include',
    });
    expect(detail.agreement.id).toBe('a1');
  });

  it('Should create an agreement', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { agreement: { id: 'a2' } }));

    const result = await createAgreement({ workspaceId: 'w1', title: 'TOS' });
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/service-agreements', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'w1', title: 'TOS' }),
    });
    expect(result.agreement.id).toBe('a2');
  });

  it('Should update an agreement draft', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'v1' }));

    // Feature 217: a draft save writes the whole authored `content`, not a filled `data` bag.
    const content = { schema: {}, uischema: { type: 'Form', label: 'New', elements: [] } };
    const result = await updateAgreementDraft('a1', 'v1', { content });
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/service-agreements/a1/versions/v1', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    expect(result.id).toBe('v1');
  });

  it('Should add an agreement version', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'v2' }));

    const result = await addAgreementVersion('a1');
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/service-agreements/a1/versions', {
      method: 'POST',
      credentials: 'include',
    });
    expect(result.id).toBe('v2');
  });

  it('Should publish an agreement version', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'v2', status: 'published' }));

    const result = await publishAgreementVersion('a1', 'v2');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/service-agreements/a1/versions/v2/publish',
      {
        method: 'POST',
        credentials: 'include',
      },
    );
    expect(result.status).toBe('published');
  });

  it('Should query workspace default agreements', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { items: [{ id: 'def-1' }] }));

    const options = workspaceDefaultAgreementsQueryOptions('w1');
    expect(options.queryKey).toEqual(['workspace-default-agreements', 'w1']);

    const items = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/workspaces/w1/default-agreements', {
      credentials: 'include',
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('def-1');
  });

  it('Should add workspace default agreement', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'def-2' }));

    const result = await addDefaultAgreement('w1', 'a1');
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/workspaces/w1/default-agreements', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ agreementDocumentId: 'a1' }),
    });
    expect(result.id).toBe('def-2');
  });

  it('Should remove workspace default agreement', async () => {
    mockFetch.mockResolvedValue(mockResponse(204, null));

    await removeDefaultAgreement('w1', 'def-2');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/workspaces/w1/default-agreements/def-2',
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );
  });

  it('Should throw descriptive error on failure responses', async () => {
    // 1. Generic error status
    mockFetch.mockResolvedValue(mockResponse(500, null, false));
    let err1: Error | undefined;
    try {
      await addAgreementVersion('a1');
    } catch (e) {
      err1 = e as Error;
    }
    expect(err1?.message).toBe('Request failed: 500');

    // 2. JSON error response with message
    mockFetch.mockResolvedValue(mockResponse(400, { message: 'Malformed JSON payload' }, false));
    let err2: Error | undefined;
    try {
      await addAgreementVersion('a1');
    } catch (e) {
      err2 = e as Error;
    }
    expect(err2?.message).toBe('Malformed JSON payload');

    // 3. JSON error response with message and errors array
    mockFetch.mockResolvedValue(
      mockResponse(
        422,
        {
          message: 'Validation failed',
          errors: ['Field A is required', 'Field B must be positive'],
        },
        false,
      ),
    );
    let err3: Error | undefined;
    try {
      await addAgreementVersion('a1');
    } catch (e) {
      err3 = e as Error;
    }
    expect(err3?.message).toBe('Validation failed: Field A is required; Field B must be positive');
  });

  it('Should throw simple failure error on removeDefaultAgreement failure', async () => {
    mockFetch.mockResolvedValue(mockResponse(403, null, false));
    let err: Error | undefined;
    try {
      await removeDefaultAgreement('w1', 'def-2');
    } catch (e) {
      err = e as Error;
    }
    expect(err?.message).toBe('Remove default failed: 403');
  });
});
