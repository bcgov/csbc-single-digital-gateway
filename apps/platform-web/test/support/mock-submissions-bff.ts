import { vi } from 'vitest';
import { jsonResponse, type MockAuthOptions } from './render-app';
import { adminUser, adminWorkspace } from './fixtures';
import { mockAuthUser } from './mock-auth-user';

interface MockSubmissionsBffOptions extends MockAuthOptions {
  filtered?: boolean;
}

/**
 * Mock submissions BFF for testing.
 * @param submissions The submissions to return.
 * @param user The user to return.
 * @param options The options to return.
 * @returns The mock submissions BFF.
 */
export function mockSubmissionsBff(
  submissions: { items: any[] },
  user: unknown | null = adminUser,
  options: MockSubmissionsBffOptions = { workspaces: [adminWorkspace] },
) {
  const mergedOptions: MockSubmissionsBffOptions = {
    workspaces: [adminWorkspace],
    ...options,
  };
  const base = mockAuthUser(user, mergedOptions);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const subMatch = url.match(/\/v1\/submissions\/([^/?]+)/);
    if (subMatch) {
      const subId = subMatch[1];
      const items = submissions.items;
      const item = items.find((s: any) => s?.id === subId) ?? items[0] ?? submissions;
      return jsonResponse(item);
    }
    if (url.includes('/v1/submissions')) {
      if (mergedOptions.filtered) {
        const searchParams = new URL(url, 'http://x').searchParams;
        const statusParam = searchParams.get('status');
        const submissionsList = submissions.items;
        const filtered = statusParam
          ? submissionsList.filter((s: any) => s.status === statusParam)
          : submissionsList;
        return jsonResponse({ items: filtered });
      }
      return jsonResponse(submissions);
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
