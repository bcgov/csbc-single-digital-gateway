import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  servicesQueryOptions,
  serviceQueryOptions,
  serviceDefinitionQueryOptions,
  formTypesQueryOptions,
  formsCatalogQueryOptions,
  serviceReferencesQueryOptions,
  createService,
  updateDraft,
  publishVersion,
  archiveVersion,
  addServiceVersion,
  deleteService,
  discardServiceVersion,
  archiveService,
  reactivateService,
  createReferencedForm,
  removeReference,
  archiveReference,
  serviceAgreementRefsQueryOptions,
  attachServiceAgreement,
  detachServiceAgreement,
  createExternalApplication,
  updateExternalApplication,
  selectServiceVersion,
  definitionForServiceVersion,
  type ServiceListParams,
  type ServiceDetail,
  type ServiceVersion,
} from '@/lib/services';

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

  it('queries published form types filtered by kind basic-form and multi-stage-form', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, {
        items: [
          { type: { id: 'ft-1', name: 'Form One', kind: 'basic-form' } },
          { type: { id: 'ft-2', name: 'Form Two', kind: 'multi-stage-form' } },
          { type: { id: 'ft-3', name: 'Document Type', kind: 'some-other-kind' } },
        ],
      }),
    );

    const options = formTypesQueryOptions();
    expect(options.queryKey).toEqual(['document-types', 'forms']);

    const types = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/document-types', {
      credentials: 'include',
    });
    expect(types).toHaveLength(2);
    expect(types[0]).toEqual({ typeId: 'ft-1', name: 'Form One', kind: 'basic-form' });
    expect(types[1]).toEqual({ typeId: 'ft-2', name: 'Form Two', kind: 'multi-stage-form' });
  });

  it('queries forms catalog entries with query options', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { items: [{ documentId: 'doc-1', title: 'Doc Form' }] }),
    );

    const options = formsCatalogQueryOptions('ws-1');
    expect(options.queryKey).toEqual(['services', 'forms', 'ws-1']);

    const catalog = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services/forms?workspaceId=ws-1', {
      credentials: 'include',
    });
    expect(catalog).toHaveLength(1);
  });

  it('queries service references for a specific service version', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { items: [{ id: 'ref-1', relation: 'application_form' }] }),
    );

    const options = serviceReferencesQueryOptions('srv-1', 'ver-1');
    expect(options.queryKey).toEqual(['services', 'detail', 'srv-1', 'references', 'ver-1']);

    const references = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/services/srv-1/versions/ver-1/references',
      { credentials: 'include' },
    );
    expect(references).toHaveLength(1);
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

    const input = {
      workspaceId: 'ws-1',
      title: 'Service Intake',
      data: {},
      applications: [],
    };

    const res = await createService(input);
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    expect(res.service.id).toBe('srv-1');
  });

  it('saves draft service version data with a PATCH request', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'ver-1', data: { updated: true } }));

    const input = { data: { updated: true } };
    const res = await updateDraft('srv-1', 'ver-1', input);
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/services/srv-1/versions/ver-1', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    expect(res.data).toEqual({ updated: true });
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

  it('manages form reference creation, delete, and archive', async () => {
    mockFetch.mockResolvedValue(mockResponse(201, { id: 'ref-1' }));

    const input = { typeId: 'ft-1', title: 'New Form' };
    const ref = await createReferencedForm('srv-1', 'ver-1', input);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/services/srv-1/versions/ver-1/forms',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
    expect(ref.id).toBe('ref-1');

    // Remove reference
    mockFetch.mockResolvedValue(mockResponse(204, null));
    await removeReference('srv-1', 'ver-1', 'ref-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/services/srv-1/versions/ver-1/references/ref-1',
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );

    // Archive reference
    await archiveReference('srv-1', 'ver-1', 'ref-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://bff-test/v1/services/srv-1/versions/ver-1/references/ref-1/archive',
      {
        method: 'POST',
        credentials: 'include',
      },
    );
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

    it('handles deletion, archive, reactivation, and reference failures gracefully', async () => {
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

      const err5 = await runAndCatch(() => removeReference('srv-1', 'ver-1', 'ref-1'));
      expect(err5?.message).toBe('Request failed: 409');

      const err6 = await runAndCatch(() => archiveReference('srv-1', 'ver-1', 'ref-1'));
      expect(err6?.message).toBe('Request failed: 409');
    });

    it('queries service agreements attached to a service version', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, {
          items: [{ id: 'ref-1', agreementDocumentId: 'doc-1', title: 'Terms' }],
        }),
      );

      const options = serviceAgreementRefsQueryOptions('srv-1', 'ver-1');
      expect(options.queryKey).toEqual(['services', 'detail', 'srv-1', 'agreements', 'ver-1']);

      const agreements = await (options.queryFn as any)();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/services/srv-1/versions/ver-1/agreements',
        { credentials: 'include' },
      );
      expect(agreements).toHaveLength(1);
      expect(agreements[0].title).toBe('Terms');
    });

    it('attaches a service agreement', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, { id: 'ref-1', agreementDocumentId: 'doc-1', title: 'Terms' }),
      );

      const res = await attachServiceAgreement('srv-1', 'ver-1', 'doc-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/services/srv-1/versions/ver-1/agreements',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ agreementDocumentId: 'doc-1' }),
        }),
      );
      expect(res.title).toBe('Terms');
    });

    it('detaches a service agreement successfully or throws error on failure', async () => {
      mockFetch.mockResolvedValue(mockResponse(204, null, true));

      await detachServiceAgreement('srv-1', 'ver-1', 'ref-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/services/srv-1/versions/ver-1/agreements/ref-1',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      } as Response);

      let thrown: Error | undefined;
      try {
        await detachServiceAgreement('srv-1', 'ver-1', 'ref-1');
      } catch (err) {
        thrown = err as Error;
      }
      expect(thrown).toBeDefined();
      expect(thrown?.message).toBe('Request failed: 400');
    });

    it('creates an external application method', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, {
          id: 'ref-1',
          relation: 'external_application',
          targetTitle: 'Go link',
        }),
      );

      const res = await createExternalApplication('srv-1', 'ver-1', {
        label: 'Go',
        url: 'https://go.com',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/services/srv-1/versions/ver-1/external-applications',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ label: 'Go', url: 'https://go.com' }),
        }),
      );
      expect(res.targetTitle).toBe('Go link');
    });

    it('updates an external application method', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, {
          id: 'ref-1',
          relation: 'external_application',
          targetTitle: 'Updated Go Link',
        }),
      );

      const res = await updateExternalApplication('srv-1', 'ver-1', 'ref-1', {
        label: 'Go New',
        url: 'https://go-new.com',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/services/srv-1/versions/ver-1/external-applications/ref-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ label: 'Go New', url: 'https://go-new.com' }),
        }),
      );
      expect(res.targetTitle).toBe('Updated Go Link');
    });
  });

  describe('servicesQueryOptions search query handling', () => {
    it('appends search parameter q when non-empty', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, { items: [{ id: 'srv-2', title: 'Service B' }] }),
      );

      const params: ServiceListParams = {
        q: 'license renewal',
        sort: 'title',
        order: 'asc',
        limit: 25,
        offset: 10,
      };
      const options = servicesQueryOptions('ws-2', params);
      const items = await (options.queryFn as any)();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://bff-test/v1/services?workspaceId=ws-2&sort=title&order=asc&limit=25&offset=10&q=license+renewal',
        { credentials: 'include' },
      );
      expect(items.items).toHaveLength(1);
    });
  });

  describe('selectServiceVersion', () => {
    const v1: ServiceVersion = {
      id: 'v1',
      documentId: 'doc-1',
      typeVersionId: 'tv-1',
      version: 1,
      status: 'archived',
      data: {},
      createdAt: '2026-01-01T00:00:00Z',
      publishedAt: null,
      archivedAt: '2026-01-02T00:00:00Z',
    };
    const v2: ServiceVersion = {
      id: 'v2',
      documentId: 'doc-1',
      typeVersionId: 'tv-2',
      version: 2,
      status: 'published',
      data: {},
      createdAt: '2026-01-03T00:00:00Z',
      publishedAt: '2026-01-03T00:00:00Z',
      archivedAt: null,
    };
    const v3: ServiceVersion = {
      id: 'v3',
      documentId: 'doc-1',
      typeVersionId: 'tv-3',
      version: 3,
      status: 'draft',
      data: {},
      createdAt: '2026-01-04T00:00:00Z',
      publishedAt: null,
      archivedAt: null,
    };

    it('returns the requested version when versionId is provided and exists', () => {
      expect(selectServiceVersion([v1, v2, v3], 'v1')).toEqual(v1);
      expect(selectServiceVersion([v1, v2, v3], 'v3')).toEqual(v3);
    });

    it('returns undefined when versionId is provided but not found', () => {
      expect(selectServiceVersion([v1, v2, v3], 'v-unknown')).toBeUndefined();
    });

    it('returns the published version when versionId is omitted', () => {
      expect(selectServiceVersion([v1, v2, v3])).toEqual(v2);
    });

    it('falls back to the latest version when no version is published and versionId is omitted', () => {
      expect(selectServiceVersion([v1, v3])).toEqual(v3);
    });

    it('returns undefined when versions array is empty and versionId is omitted', () => {
      expect(selectServiceVersion([])).toBeUndefined();
    });
  });

  describe('definitionForServiceVersion', () => {
    const v1: ServiceVersion = {
      id: 'v1',
      documentId: 'doc-1',
      typeVersionId: 'tv-1',
      version: 1,
      status: 'published',
      data: {},
      createdAt: '2026-01-01T00:00:00Z',
      publishedAt: '2026-01-01T00:00:00Z',
      archivedAt: null,
    };
    const v2: ServiceVersion = {
      id: 'v2',
      documentId: 'doc-1',
      typeVersionId: 'tv-missing-def',
      version: 2,
      status: 'draft',
      data: {},
      createdAt: '2026-01-02T00:00:00Z',
      publishedAt: null,
      archivedAt: null,
    };

    const def1 = { schema: { title: 'Def 1' }, uischema: { type: 'Control' } };
    const defaultDef = { schema: { title: 'Default Def' }, uischema: { type: 'VerticalLayout' } };

    const mockDetail: ServiceDetail = {
      service: {
        id: 'srv-1',
        workspaceId: 'ws-1',
        title: 'Service 1',
        description: 'Test Service',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      versions: [v1, v2],
      definition: defaultDef,
      definitions: {
        'tv-1': def1,
      },
      hasSubmissions: false,
    };

    it('returns undefined when detail is undefined', () => {
      expect(definitionForServiceVersion(undefined)).toBeUndefined();
    });

    it('returns undefined when version cannot be selected', () => {
      expect(definitionForServiceVersion({ ...mockDetail, versions: [] })).toBeUndefined();
      expect(definitionForServiceVersion(mockDetail, 'non-existent-version')).toBeUndefined();
    });

    it('returns definition matching the version typeVersionId when present in definitions record', () => {
      expect(definitionForServiceVersion(mockDetail, 'v1')).toEqual(def1);
    });

    it('falls back to detail.definition when typeVersionId is not in definitions record', () => {
      expect(definitionForServiceVersion(mockDetail, 'v2')).toEqual(defaultDef);
    });
  });
});
