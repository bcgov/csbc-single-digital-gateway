import { vi } from 'vitest';
import { authedUser, jsonResponse, mockAuth } from './render-app';
import { adminWorkspace } from './fixtures';

export function createMockSubmissionsBff(
  mockBasicSubmission: object,
  base?: ReturnType<typeof mockAuth>,
) {
  const mockBase = base || mockAuth(authedUser, { workspaces: [adminWorkspace] });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/submissions')) {
      return jsonResponse(mockBasicSubmission);
    }
    if (url.includes('/v1/submissions/sub-123')) {
      return jsonResponse(mockBasicSubmission);
    }
    return (mockBase as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
