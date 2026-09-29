import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  addServiceVersion,
  archiveService,
  archiveVersion,
  createService,
  definitionForServiceVersion,
  deleteService,
  discardServiceVersion,
  publishVersion,
  reactivateService,
  selectServiceVersion,
  serviceDefinitionQueryOptions,
  serviceQueryOptions,
  servicesQueryOptions,
  updateDraft,
  type ServiceListParams,
  type ServiceVersion,
} from '@/lib/services';

/**
 * Feature 217: the reference, agreement-ref, forms-catalog and form-type endpoints are gone with
 * `document_references`, and a service create/save carries a title / `content` instead of `data`
 * and `applications`.
 */

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

const runAndCatch = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return null;
  } catch (err) {
    return err as Error;
  }
};

const version = (over: Partial<ServiceVersion>): ServiceVersion => ({
  id: 'v1',
  documentId: 'srv-1',
  templateVersionId: 'tv-1',
  versionNumber: 1,
  revision: 1,
  status: 'draft',
  title: null,
  description: null,
  content: {},
  createdAt: '2026-07-28T12:00:00.000Z',
  publishedAt: null,
  archivedAt: null,
  ...over,
});

describe('Services Unit Test Suite', () => {
  const mockFetch = vi.fn();
  globalThis.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('queries all services Summaries with query options', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { items: [{ id: 'srv-1', title: 'Service A' }] }),
    );

    const params: ServiceListParams = {
      q: '',
      sort: 'updated',
      order: 'desc',
      limit: 10,
      offset: 0,
    };
    const options = servicesQueryOptions('ws-1', params);
    expect(options.queryKey).toEqual(['services', 'ws-1', params]);

    const items = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/services?workspaceId=ws-1&sort=updated&order=desc&limit=10&offset=0',
      {
        credentials: 'include',
      },
    );
    expect(items.items).toHaveLength(1);
    expect(items.items[0].title).toBe('Service A');
  });

  it('queries a single service details by id', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { service: { id: 'srv-1', title: 'Service A' }, versions: [] }),
    );

    const options = serviceQueryOptions('srv-1');
    expect(options.queryKey).toEqual(['services', 'detail', 'srv-1']);

    const details = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services/srv-1', {
      credentials: 'include',
    });
    expect(details.service.title).toBe('Service A');
  });

  it('queries service definitions schema details', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { schema: { type: 'object' }, uischema: {} }));

    const options = serviceDefinitionQueryOptions();
    expect(options.queryKey).toEqual(['services', 'definition']);

    const definition = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services/definition', {
      credentials: 'include',
    });
    expect(definition.schema).toBeDefined();
  });

  it('handles detailed API error message array structures', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(
        422,
        { message: 'Schema invalid', errors: ['Field name missing', 'Properties duplicate'] },
        false,
      ),
    );

    const options = serviceQueryOptions('srv-1');
    await expect((options.queryFn as any)().catch((e: any) => e.message)).resolves.toContain(
      'Schema invalid: Field name missing; Properties duplicate',
    );
  });

  it('creates service with a POST request', async () => {
    mockFetch.mockResolvedValue(mockResponse(201, { service: { id: 'srv-1' }, versions: [] }));

    const input = { workspaceId: 'ws-1', title: 'Service Intake' };

    const res = await createService(input);
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    expect(res.service.id).toBe('srv-1');
  });

  it("saves a draft version's content with a PATCH request", async () => {
    const content = {
      schema: { type: 'object', properties: {} },
      uischema: { type: 'Service', elements: [] },
    };
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'ver-1', content }));

    const input = { content };
    const res = await updateDraft('srv-1', 'ver-1', input);
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services/srv-1/versions/ver-1', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    expect(res.content).toEqual(content);
  });

  it('handles simple publish, archive, and add version triggers', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'ver-1', status: 'published' }));

    const pub = await publishVersion('srv-1', 'ver-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/services/srv-1/versions/ver-1/publish',
      {
        method: 'POST',
        credentials: 'include',
      },
    );
    expect(pub.status).toBe('published');

    mockFetch.mockResolvedValue(mockResponse(200, { id: 'ver-1', status: 'archived' }));
    const arch = await archiveVersion('srv-1', 'ver-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/services/srv-1/versions/ver-1/archive',
      {
        method: 'POST',
        credentials: 'include',
      },
    );
    expect(arch.status).toBe('archived');

    mockFetch.mockResolvedValue(mockResponse(201, { id: 'ver-2' }));
    const addVer = await addServiceVersion('srv-1');
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services/srv-1/versions', {
      method: 'POST',
      credentials: 'include',
    });
    expect(addVer.id).toBe('ver-2');
  });

  it('sends DELETE requests for deleteService and discardServiceVersion', async () => {
    mockFetch.mockResolvedValue(mockResponse(204, null));

    await deleteService('srv-1');
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services/srv-1', {
      method: 'DELETE',
      credentials: 'include',
    });

    await discardServiceVersion('srv-1', 'ver-1');
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services/srv-1/versions/ver-1', {
      method: 'DELETE',
      credentials: 'include',
    });
  });

  it('sends POST requests for archiveService and reactivateService', async () => {
    mockFetch.mockResolvedValue(mockResponse(204, null));

    await archiveService('srv-1');
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services/srv-1/archive', {
      method: 'POST',
      credentials: 'include',
    });

    await reactivateService('srv-1');
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services/srv-1/reactivate', {
      method: 'POST',
      credentials: 'include',
    });
  });

  describe('API error handling boundaries', () => {
    it('handles non-JSON error body gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      const options = serviceQueryOptions('srv-1');
      let thrown: Error | undefined;
      try {
        await (options.queryFn as any)();
      } catch (err) {
        thrown = err as Error;
      }
      expect(thrown).toBeDefined();
      expect(thrown?.message).toContain('Request failed: 500');
    });

    it('handles JSON error body with errors array but no message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ errors: ['Direct Error Description'] }),
      } as Response);

      const options = serviceQueryOptions('srv-1');
      let thrown: Error | undefined;
      try {
        await (options.queryFn as any)();
      } catch (err) {
        thrown = err as Error;
      }
      expect(thrown).toBeDefined();
      expect(thrown?.message).toBe('Request failed: 400: Direct Error Description');
    });

    it('handles JSON error body with message but no errors array', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Only Message' }),
      } as Response);

      const options = serviceQueryOptions('srv-1');
      let thrown: Error | undefined;
      try {
        await (options.queryFn as any)();
      } catch (err) {
        thrown = err as Error;
      }
      expect(thrown).toBeDefined();
      expect(thrown?.message).toBe('Only Message');
    });

    it('handles deletion, archive and reactivation failures gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
      } as Response);

      const err1 = await runAndCatch(() => deleteService('srv-1'));
      expect(err1?.message).toBe('Request failed: 409');

      const err2 = await runAndCatch(() => discardServiceVersion('srv-1', 'ver-1'));
      expect(err2?.message).toBe('Request failed: 409');

      const err3 = await runAndCatch(() => archiveService('srv-1'));
      expect(err3?.message).toBe('Request failed: 409');

      const err4 = await runAndCatch(() => reactivateService('srv-1'));
      expect(err4?.message).toBe('Request failed: 409');
    });

    it("surfaces the API's own refusal reason from a no-content endpoint (doc 230)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            message: 'This service has submissions — archive it instead of deleting it',
          }),
      } as unknown as Response);

      const err = await runAndCatch(() => deleteService('srv-1'));
      expect(err?.message).toBe('This service has submissions — archive it instead of deleting it');
    });
  });

  describe('version selection (feature 174)', () => {
    it('prefers the version named in the path', () => {
      const versions = [version({ id: 'v1' }), version({ id: 'v2' })];

      expect(selectServiceVersion(versions, 'v2')?.id).toBe('v2');
      expect(selectServiceVersion(versions, 'missing')).toBeUndefined();
    });

    it('falls back to the published version, then to the newest', () => {
      const published = version({ id: 'v1', status: 'published' });
      const draft = version({ id: 'v2', versionNumber: 2 });

      expect(selectServiceVersion([published, draft])?.id).toBe('v1');
      expect(selectServiceVersion([draft])?.id).toBe('v2');
      expect(selectServiceVersion([])).toBeUndefined();
    });

    it('resolves the template the selected version was authored under, by templateVersionId', () => {
      const detail = {
        service: {} as never,
        versions: [version({ id: 'v1', templateVersionId: 'tv-old' })],
        definition: { schema: { marker: 'current' }, uischema: {} },
        definitions: { 'tv-old': { schema: { marker: 'old' }, uischema: {} } },
        hasSubmissions: false,
        deletable: { service: true, versionIds: [] },
      };

      expect(definitionForServiceVersion(detail, 'v1')?.schema).toEqual({ marker: 'old' });
    });

    it('falls back to the current definition for an unknown or absent template version', () => {
      const detail = {
        service: {} as never,
        versions: [version({ id: 'v1', templateVersionId: null })],
        definition: { schema: { marker: 'current' }, uischema: {} },
        definitions: {},
        hasSubmissions: false,
        deletable: { service: true, versionIds: [] },
      };

      expect(definitionForServiceVersion(detail, 'v1')?.schema).toEqual({ marker: 'current' });
      expect(definitionForServiceVersion(undefined)).toBeUndefined();
    });
  });
});
