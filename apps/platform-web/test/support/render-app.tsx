import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

/** Build a router over the real route tree, mounted at `initialPath`, with a fresh query context. */
export function renderApp(initialPath = '/app') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    context: { queryClient },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { queryClient, router, ...utils };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A representative authenticated staff user as returned by `GET /auth/me`. */
export const authedUser = {
  id: 'u1',
  roles: ['staff'],
  claims: {
    sub: 'subject-1',
    name: 'Maya Reyes',
    email: 'maya.reyes@riverton.gov',
    preferred_username: 'maya',
  },
};

/**
 * Capture `window.location.assign` calls. jsdom's `assign` is non-configurable so it can't be spied
 * directly — proxy the real location and intercept just `assign`. Returns the mock + a restore fn.
 */
export function stubLocationAssign(): { assign: ReturnType<typeof vi.fn>; restore: () => void } {
  const original = window.location;
  const assign = vi.fn();
  const stub = {
    href: original.href,
    origin: original.origin,
    protocol: original.protocol,
    host: original.host,
    hostname: original.hostname,
    port: original.port,
    pathname: original.pathname,
    search: original.search,
    hash: original.hash,
    assign,
    replace: vi.fn(),
    reload: vi.fn(),
    toString: () => original.href,
  };
  Object.defineProperty(window, 'location', { configurable: true, value: stub });
  return {
    assign,
    restore: () =>
      Object.defineProperty(window, 'location', { configurable: true, value: original }),
  };
}

/** Stub `fetch` so `/auth/me` returns `user` (or 401 when null) and `/auth/logout` succeeds. */
export function mockAuth(user: unknown | null): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) {
      return user === null ? new Response(null, { status: 401 }) : jsonResponse(user);
    }
    if (url.includes('/auth/logout')) {
      return new Response(null, { status: 200 });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
