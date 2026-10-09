import { vi } from 'vitest';
import { adminUser, adminWorkspace, ISO } from './fixtures';
import { jsonResponse } from './render-app';
import type { MockAuthOptions } from './render-app';
import { mockAuthUser } from './mock-auth-user';

/**
 * Options for mockWorkspacesDefaultAgreementsBff.
 */
interface MockWorkspacesDefaultAgreementsBffOptions extends MockAuthOptions {
  /** The user to return. */
  user?: unknown | null;
  /** The test file name to match for routing. */
  testFile?: string;
  /** The role to return. */
  role?: string;
  /** Whether the API failed. */
  failedApi?: boolean;
  /** The defaults to return. */
  defaults?: any[];
  /** The agreements to return. */
  agreements?: any[];
  /** Whether to mock the response. */
  mockResponse?: boolean;
  /** Whether to mock errors. */
  mockErrors?: boolean;
}

/**
 * Creates a mock BFF for the workspaces default agreements.
 * @param agreement Agreement to use for the mock.
 * @param options Options for the mock.
 * @param options.user The user to return.
 * @param options.testFile The test file name to match for routing.
 * @param options.role The role to return.
 * @param options.failedApi Whether the API failed.
 * @param options.defaults The defaults to return.
 * @param options.agreements The agreements to return.
 * @param options.mockResponse Whether to mock the response.
 * @param options.mockErrors Whether to mock errors.
 * @returns A mock fetch function.
 */
export function mockWorkspacesDefaultAgreementsBff(
  agreement: any,
  options: MockWorkspacesDefaultAgreementsBffOptions = {},
) {
  const mergedOptions: MockWorkspacesDefaultAgreementsBffOptions = {
    user: adminUser,
    workspaces: [adminWorkspace],
    ...options,
  };
  const base = mockAuthUser(mergedOptions.user, mergedOptions);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    const baseWorkspace = mergedOptions.workspaces?.[0] ?? adminWorkspace;
    const responseWorkspace = {
      ...baseWorkspace,
      role:
        mergedOptions.role ?? (mergedOptions.user as any)?.role ?? baseWorkspace.role ?? 'admin',
    };
    if (url.includes('/v1/workspaces/by-slug/')) {
      return jsonResponse(responseWorkspace);
    }

    if (url.includes('/v1/workspaces/w1/default-agreements')) {
      if (method === 'POST') {
        if (mergedOptions.failedApi) {
          return new Response(
            JSON.stringify({ message: 'Server failed to save default agreement' }),
            {
              status: 500,
              headers: { 'content-type': 'application/json' },
            },
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (mergedOptions.mockErrors) {
          return jsonResponse({ message: 'Failed to add default agreement' }, 400);
        }
        if (mergedOptions.mockResponse) {
          return jsonResponse({
            id: 'd2',
            agreementDocumentId: 'a2',
            title: 'Privacy policy',
            isOptional: true,
            isGlobal: true,
            createdAt: ISO,
          });
        }
        return jsonResponse({
          id: 'd2',
          agreementDocumentId: 'a2',
          title: 'Privacy policy',
          isOptional: true,
          isGlobal: true,
          createdAt: ISO,
        });
      }
      if (method === 'DELETE') {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (mergedOptions.mockErrors) {
          return new Response(null, { status: 400 });
        }
        return new Response(null, { status: 204 });
      }
      return jsonResponse({ items: mergedOptions.defaults ?? [agreement] });
    }

    const defaultAgreements = [
      { id: 'a1', workspaceId: 'w1', title: 'Terms of service', status: 'published' },
      { id: 'a2', workspaceId: null, title: 'Privacy policy', status: 'published' },
      { id: 'a3', workspaceId: 'w1', title: 'Workspace Custom TOS', status: 'published' },
    ];
    if (url.includes('/v1/service-agreements')) {
      return jsonResponse({
        items: mergedOptions.agreements ?? defaultAgreements,
      });
    }

    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
