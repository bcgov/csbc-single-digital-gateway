import { vi } from 'vitest';
import { jsonResponse, type MockAuthOptions } from './render-app';
import { adminUser, adminWorkspace, ISO } from './fixtures';
import { mockAuthUser } from './mock-auth-user';

/**
 * Options for mockSubmissionsBff.
 */
interface MockSubmissionsBffOptions extends MockAuthOptions {
  /** The user to return. */
  user?: unknown | null;
  /** The test file name to match for routing. */
  testFile?: string;
  /** Whether to filter submissions. */
  filtered?: boolean;
  /** The detail object to return for a submission. */
  detail?: object;
}

/**
 * Mock submissions BFF for testing.
 * @param submissions The submissions to return.
 * @param options The options to return.
 * @param options.user The user to return.
 * @param options.testFile The test file name to match for routing.
 * @param options.filtered Whether to filter submissions.
 * @param options.detail The detail object to return for a submission.
 * @returns The mock submissions BFF.
 */
export function mockSubmissionsBff(
  submissions: { items: any[] },
  options: MockSubmissionsBffOptions = {},
) {
  const mergedOptions = { user: adminUser, workspaces: [adminWorkspace], ...options };
  const base = mockAuthUser(mergedOptions.user, mergedOptions);
  let reviewed = false;
  const approved = {
    ...options.detail,
    status: 'approved',
    statusLabel: 'Approved',
    reviews: [
      {
        id: 'r1',
        decision: 'approved',
        reason: null,
        reviewerName: 'Maya Reyes',
        createdAt: ISO,
      },
    ],
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (options.testFile === 'submissions.test') {
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
    }

    if (options.testFile === 'console-submissions.e2e.test') {
      if (url.includes('/v1/submissions/sub1/review') && method === 'POST') {
        reviewed = true;
        return jsonResponse(approved);
      }
      if (url.endsWith('/v1/submissions/sub1'))
        return jsonResponse(reviewed ? approved : options.detail);
      if (url.includes('/v1/submissions')) {
        const summary = submissions.items[0];
        const items = [
          reviewed ? { ...summary, status: 'approved', statusLabel: 'Approved' } : summary,
        ];
        return jsonResponse({ items, total: items.length, limit: 20, offset: 0 });
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
