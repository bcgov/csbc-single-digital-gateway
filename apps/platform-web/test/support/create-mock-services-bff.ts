import { vi } from 'vitest';
import { authedUser, jsonResponse, mockAuth } from './render-app';
import { workspace } from './fixtures';

export function createMockServicesBff(
  servicesJson: object,
  referencesJson?: object,
  base?: ReturnType<typeof mockAuth>,
) {
  const mockBase = base || mockAuth(authedUser, { workspaces: [workspace] });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/document-types')) {
      return jsonResponse({ items: [] });
    }
    if (url.includes('/v1/services/s1')) {
      if (url.endsWith('/references')) {
        return jsonResponse(referencesJson ?? { items: [] });
      }
      if (url.endsWith('/agreements')) {
        return jsonResponse({ items: [] });
      }
      return jsonResponse(servicesJson);
    }
    if (url.includes('/v1/services')) {
      return jsonResponse(servicesJson);
    }
    return (mockBase as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
