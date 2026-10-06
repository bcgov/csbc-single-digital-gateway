import { vi } from 'vitest';
import { authedUser, jsonResponse, mockAuth } from './render-app';
import { adminWorkspace } from './fixtures';

export function createMockMembersListBff(
  memberList: { items: any[] },
  base?: ReturnType<typeof mockAuth>,
) {
  const mockBase = base || mockAuth(authedUser, { workspaces: [adminWorkspace] });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/workspaces/w1/members')) {
      return jsonResponse(memberList);
    }
    if (url.includes('/members/page')) {
      return jsonResponse({
        items: memberList.items,
        total: memberList.items.length,
        limit: 20,
        offset: 0,
      });
    }
    return (mockBase as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
