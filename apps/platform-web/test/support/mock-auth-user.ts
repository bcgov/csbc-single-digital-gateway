import { vi } from 'vitest';
import { jsonResponse } from './render-app';
import type { MockAuthOptions, WorkspaceLike } from './render-app';
import { adminWorkspace } from './fixtures';

export function mockAuthUser(
  user: unknown | null,
  options: MockAuthOptions = { workspaces: [adminWorkspace] },
): ReturnType<typeof vi.fn> {
  const mergedOptions: MockAuthOptions = {
    workspaces: [adminWorkspace],
    ...options,
  };
  const store: WorkspaceLike[] = [...(mergedOptions.workspaces ?? [])];

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) {
      return user === null ? new Response(null, { status: 401 }) : jsonResponse(user);
    }
    if (url.includes('/auth/logout')) {
      return new Response(null, { status: 200 });
    }
    if (url.includes('/v1/workspaces/by-slug/')) {
      const slug = decodeURIComponent(url.split('/v1/workspaces/by-slug/')[1]?.split('?')[0] ?? '');
      const found = store.find((workspace) => workspace.slug === slug);
      return found ? jsonResponse(found) : new Response(null, { status: 404 });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
