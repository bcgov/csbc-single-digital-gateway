import { vi } from 'vitest';
import {
  adminUser,
  adminWorkspace,
  globalAgreement,
  ISO,
  serviceAgreement,
  serviceAgreementsDetailResponse,
} from './fixtures';
import { jsonResponse } from './render-app';
import type { MockAuthOptions } from './render-app';
import { mockAuthUser } from './mock-auth-user';
import type { ServiceAgreementSummary } from '@/lib/service-agreements';

/**
 * Options for mockAgreementsBff.
 */
interface MockAgreementsBffOptions extends MockAuthOptions {
  /** The user to return. */
  user?: unknown | null;
  /** The test file name to match for routing. */
  testFile?: string;
  /** The service response to return. */
  serviceResponse?: any;
  /** The URL to match for patch requests. */
  patchUrl?: string;
  /** The promise to return for put requests. */
  putPromise?: Promise<unknown>;
  /** The defaults to return. */
  defaults?: any[];
  /** The agreements to return. */
  agreements?: any[];
  /** The status to return for detach requests. */
  detachStatus?: number;
  /** The attached ref to return. */
  attachedRef?: any;
}

const consoleAgreement: ServiceAgreementSummary = {
  ...serviceAgreement,
  status: 'published',
  isGlobal: false,
};

const defaultAttachedRef = {
  id: 'ref1',
  agreementDocumentId: 'a-attached',
  title: 'Terms of service',
  isOptional: false,
  isGlobal: false,
  position: 0,
  createdAt: ISO,
};

/**
 * Creates a mock BFF for service agreements.
 * @param agreement Agreement to use for the mock.
 * @param testFile The test file identifier.
 * @param options Options for the mock.
 * @param options.user The user to return.
 * @param options.testFile The test file name to match for routing.
 * @param options.serviceResponse The service response to return.
 * @param options.patchUrl The URL to match for patch requests.
 * @param options.putPromise The promise to return for put requests.
 * @param options.defaults The defaults to return.
 * @param options.agreements The agreements to return.
 * @param options.detachStatus The status to return for detach requests.
 * @param options.attachedRef The attached ref to return.
 * @returns A mock fetch function.
 */
export function mockServiceAgreementsBff(
  agreement: ServiceAgreementSummary,
  options: MockAgreementsBffOptions = {},
) {
  const mergedOptions = { user: adminUser, workspaces: [adminWorkspace], ...options };
  const base = mockAuthUser(mergedOptions.user, mergedOptions);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (mergedOptions.testFile === 'admin-agreements-pages.test') {
      if (url.includes('/v1/service-agreements')) {
        if (method === 'POST') {
          const body = init?.body
            ? (JSON.parse(String(init.body)) as { data: { title: string } })
            : { data: { title: '' } };
          const newAgreement = {
            id: 'g2',
            workspaceId: null,
            title: body.data?.title || 'Untitled',
            kind: 'service-agreement',
            createdAt: ISO,
          };
          const newVersion = {
            id: 'v2',
            version: 1,
            status: 'draft',
            data: body.data,
            createdAt: ISO,
            publishedAt: null,
            archivedAt: null,
          };
          return jsonResponse({ agreement: newAgreement, version: newVersion });
        }
        if (
          url.includes('/v1/service-agreements/g1') ||
          url.includes('/v1/service-agreements/g2')
        ) {
          return jsonResponse(mergedOptions.serviceResponse ?? agreement);
        }

        return jsonResponse({
          items: [globalAgreement],
        });
      }
    }

    if (mergedOptions.testFile === 'agreement-detail.test') {
      if (url.includes('/v1/service-agreements')) {
        if (method === 'PATCH' && url.includes('/versions/')) {
          if (mergedOptions.putPromise) {
            await mergedOptions.putPromise;
            return new Response(null, { status: 500 });
          }
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          const updatedVersion = {
            id: 'v2',
            version: 2,
            status: 'draft',
            data: body.data,
            createdAt: ISO,
            publishedAt: null,
            archivedAt: null,
          };
          return jsonResponse(updatedVersion);
        }

        if (method === 'POST' && url.includes('/publish')) {
          const publishedVersion = {
            id: 'v2',
            version: 2,
            status: 'published',
            data: mergedOptions.serviceResponse?.versions?.[1]?.data ?? {},
            createdAt: ISO,
            publishedAt: ISO,
            archivedAt: null,
          };
          return jsonResponse(publishedVersion);
        }

        if (method === 'POST' && url.includes('/versions')) {
          const newVersion = {
            id: 'v3',
            version: 3,
            status: 'draft',
            data: mergedOptions.serviceResponse?.versions?.[1]?.data ?? {},
            createdAt: ISO,
            publishedAt: null,
            archivedAt: null,
          };
          return jsonResponse(newVersion);
        }

        return jsonResponse(mergedOptions.serviceResponse ?? agreement);
      }
    }

    if (mergedOptions.testFile === 'console-agreements-pages.test') {
      if (url.includes('/default-agreements')) {
        return jsonResponse({ items: [] });
      }

      if (url.includes('/v1/service-agreements')) {
        if (method === 'POST') {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          return jsonResponse({
            agreement: {
              id: 'a2',
              title: body.data?.title || 'Untitled',
              workspaceId: 'w1',
              createdAt: ISO,
            },
            version: { id: 'v2', version: 1, status: 'draft', data: body.data, createdAt: ISO },
          });
        }

        if (
          url.includes('/v1/service-agreements/a1') ||
          url.includes('/v1/service-agreements/a2') ||
          url.includes('/v1/service-agreements/g1')
        ) {
          return jsonResponse({
            ...serviceAgreementsDetailResponse,
            agreement: { ...serviceAgreementsDetailResponse.agreement, workspaceId: 'w1' },
          });
        }

        return jsonResponse({ items: [consoleAgreement] });
      }
    }

    if (mergedOptions.testFile === 'service-agreement-methods.test') {
      if (method === 'DELETE' && url.includes('/agreements/')) {
        if ((mergedOptions.detachStatus ?? 200) >= 400) {
          return jsonResponse({ message: 'Delete failed' }, mergedOptions.detachStatus ?? 500);
        }
        return new Response(null, { status: 204 });
      }
      if (url.includes('/default-agreements')) {
        return jsonResponse({ items: mergedOptions.defaults ?? [] });
      }
      if (url.includes('/agreements')) {
        const items =
          mergedOptions.attachedRef !== undefined
            ? Array.isArray(mergedOptions.attachedRef)
              ? mergedOptions.attachedRef
              : [mergedOptions.attachedRef]
            : [defaultAttachedRef];
        return jsonResponse({ items });
      }
      if (url.includes('/v1/service-agreements')) {
        return jsonResponse({
          items: [
            {
              id: 'a-attached',
              agreementDocumentId: 'a-attached',
              title: 'Terms of service',
              status: 'published',
              isOptional: false,
              isGlobal: false,
            },
            {
              id: 'a-available',
              workspaceId: null,
              title: 'Privacy policy',
              kind: 'service-agreement',
              createdAt: ISO,
              status: 'published',
              isGlobal: true,
            },
            {
              id: 'a-draft',
              workspaceId: 'w1',
              title: 'Draft notice',
              kind: 'service-agreement',
              createdAt: ISO,
              status: 'draft',
              isGlobal: false,
            },
          ],
        });
      }
      return new Response(null, { status: 404 });
    }

    if (mergedOptions.testFile === 'service-agreements-console.e2e.test') {
      const consoleWorkspaceAgreement = {
        id: 'a1',
        workspaceId: 'w1',
        title: 'Terms of service',
        kind: 'service-agreement',
        createdAt: ISO,
        updatedAt: ISO,
        status: 'draft',
        isGlobal: false,
      };
      const consoleGlobalAgreement = {
        id: 'g1',
        workspaceId: null,
        title: 'Privacy policy',
        kind: 'service-agreement',
        createdAt: ISO,
        updatedAt: ISO,
        status: 'published',
        isGlobal: true,
      };

      if (url.includes('/v1/service-agreements/page')) {
        let items: any[];
        const hasWorkspace = url.includes('workspaceId=');
        if (mergedOptions.agreements) {
          items = hasWorkspace
            ? mergedOptions.agreements.filter((a) => a.workspaceId !== null && !a.isGlobal)
            : mergedOptions.agreements.filter((a) => a.workspaceId === null || a.isGlobal);
        } else {
          items = hasWorkspace ? [consoleWorkspaceAgreement] : [consoleGlobalAgreement];
        }
        return jsonResponse({ items, total: items.length, limit: 20, offset: 0 });
      }
      if (url.includes('/v1/service-agreements')) {
        if (method === 'POST') {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          return jsonResponse({
            agreement: {
              id: 'a2',
              title: body.data?.title || 'Untitled',
              workspaceId: 'w1',
              createdAt: ISO,
            },
            version: { id: 'v2', version: 1, status: 'draft', data: body.data, createdAt: ISO },
          });
        }
        const hasWorkspace = url.includes('workspaceId=');
        return jsonResponse({
          items: hasWorkspace
            ? [consoleWorkspaceAgreement, consoleGlobalAgreement]
            : [consoleGlobalAgreement],
        });
      }
    }

    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

export const mockAdminAgreementsBff = mockServiceAgreementsBff;
