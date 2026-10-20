import { vi } from 'vitest';
import { jsonResponse, type MockAuthOptions } from './render-app';
import { adminUser, adminWorkspace, ISO } from './fixtures';
import { mockAuthUser } from './mock-auth-user';

/**
 * Options for mockServicesBff.
 */
interface MockServicesBffOptions extends MockAuthOptions {
  /** The user to return. */
  user?: unknown | null;
  /** The test file name to match for routing. */
  testFile?: string;
  /** The references JSON to return. */
  references?: object;
  /** The definition JSON to return. */
  definition?: object;
  /** The draft version JSON to return. */
  draftVersion?: object;
}

/**
 * Mock service BFF for testing.
 * @param options The options to return.
 * @param options.user The user to return.
 * @param options.testFile The test file name to match for routing.
 * @param options.references The references JSON to return.
 * @param options.definition The definition JSON to return.
 * @param options.draftVersion The draft version JSON to return.
 * @returns The mock service BFF.
 */
export function mockServicesBff(options?: MockServicesBffOptions) {
  const mergedOptions = { user: adminUser, workspaces: [adminWorkspace], ...options };
  const base = mockAuthUser(mergedOptions.user, mergedOptions);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/v1/document-types')) {
      return jsonResponse({ items: [] });
    }
    if (url.includes('/v1/services')) {
      const rest = url.split('/v1/services')[1]?.split('?')[0] ?? '';
      const segs = rest.split('/').filter(Boolean);
      if (segs[0] === 'definition') {
        return jsonResponse(mergedOptions.definition);
      }
      if (segs[0] === 'forms') {
        return jsonResponse({
          items: [{ documentId: 'f1', versionId: 'fv1', title: 'Permit form', kind: 'basic-form' }],
        });
      }
      if (segs.length === 0) {
        if (method === 'POST') {
          return jsonResponse(
            {
              service: {
                id: 's1',
                workspaceId: 'w1',
                title: 'New',
                description: '',
                createdAt: ISO,
                updatedAt: ISO,
              },
              versions: [mergedOptions.draftVersion],
            },
            201,
          );
        }
        return jsonResponse({
          items: [
            {
              id: 's1',
              workspaceId: 'w1',
              title: 'Permit application',
              description: '',
              createdAt: ISO,
              updatedAt: ISO,
              status: 'draft',
              versionCount: 1,
              hasSubmissions: true,
              latestPublished: false,
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        });
      }
      if (segs.length === 1) {
        return jsonResponse({
          service: {
            id: 's1',
            workspaceId: 'w1',
            title: 'Permit application',
            description: '',
            createdAt: ISO,
            updatedAt: ISO,
          },
          versions: [mergedOptions.draftVersion],
          definition: mergedOptions.definition,
          hasSubmissions: true,
        });
      }
      if (segs[segs.length - 1] === 'agreements') {
        return jsonResponse({ items: [] });
      }
      if (segs[segs.length - 1] === 'references') {
        return jsonResponse({
          items: [
            {
              id: 'ref1',
              relation: 'application_form',
              position: 0,
              label: 'Apply now',
              targetDocumentId: 'f1',
              targetVersionId: 'fv1',
              targetKind: 'basic-form',
              targetTitle: 'Permit form',
              targetVersion: 1,
              targetStatus: 'draft',
              hasSubmissions: false,
              hasStructure: true,
              createdAt: ISO,
            },
          ],
        });
      }
      return jsonResponse(mergedOptions.draftVersion);
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
