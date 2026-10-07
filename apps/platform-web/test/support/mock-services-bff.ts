import { vi } from 'vitest';
import { jsonResponse, type MockAuthOptions } from './render-app';
import { adminUser, adminWorkspace } from './fixtures';
import { mockAuthUser } from './mock-auth-user';

interface MockServicesBffOptions extends MockAuthOptions {
  user?: unknown | null;
  testFile?: string;
}

/**
 * Mock services BFF for testing.
 * @param services The services JSON to return.
 * @param references The references JSON to return.
 * @param user The user to return.
 * @param options The options to return.
 * @returns The mock services BFF.
 */
export function mockServicesBff(
  services: object,
  references?: object,
  options?: MockServicesBffOptions,
) {
  const mergedOptions = { user: adminUser, workspaces: [adminWorkspace], ...options };
  const base = mockAuthUser(mergedOptions.user, mergedOptions);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/document-types')) {
      return jsonResponse({ items: [] });
    }
    if (url.includes('/v1/services/s1')) {
      if (url.endsWith('/references')) {
        return jsonResponse(references ?? { items: [] });
      }
      if (url.endsWith('/agreements')) {
        return jsonResponse({ items: [] });
      }
      return jsonResponse(services);
    }
    if (url.includes('/v1/services')) {
      return jsonResponse(services);
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
