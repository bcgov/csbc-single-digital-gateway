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

export interface WorkspaceLike {
  id: string;
  slug: string;
  name: string;
  role: 'admin' | 'member';
  createdAt: string;
}

interface MockAuthOptions {
  /** Workspaces the user belongs to (the store grows when the test POSTs a new one). */
  workspaces?: WorkspaceLike[];
  /** Slug assigned to a workspace created via POST /v1/workspaces. */
  createdSlug?: string;
}

/**
 * Stub `fetch` for the BFF + platform-api endpoints the console uses:
 * `/auth/me`, `/auth/logout`, and the `/v1/workspaces` list (sort/order/limit aware) + create. The
 * workspace store is stateful so a POST in a test is reflected by the subsequent list refetch.
 */
export function mockAuth(
  user: unknown | null,
  options: MockAuthOptions = {},
): ReturnType<typeof vi.fn> {
  const store: WorkspaceLike[] = [...(options.workspaces ?? [])];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

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
    if (url.includes('/v1/workspaces')) {
      if (method === 'DELETE') {
        const id = decodeURIComponent(url.split('/v1/workspaces/')[1]?.split('?')[0] ?? '');
        const index = store.findIndex((workspace) => workspace.id === id);
        if (index >= 0) {
          store.splice(index, 1);
        }
        return new Response(null, { status: 204 });
      }
      if (method === 'PATCH') {
        const id = decodeURIComponent(url.split('/v1/workspaces/')[1]?.split('?')[0] ?? '');
        const body = init?.body ? (JSON.parse(String(init.body)) as { name?: string }) : {};
        const target = store.find((workspace) => workspace.id === id);
        if (!target) {
          return new Response(null, { status: 404 });
        }
        target.name = body.name ?? target.name;
        return jsonResponse(target);
      }
      if (method === 'POST') {
        const body = init?.body ? (JSON.parse(String(init.body)) as { name?: string }) : {};
        const slug = options.createdSlug ?? `ws-${store.length + 1}`;
        const created: WorkspaceLike = {
          id: `id-${slug}`,
          slug,
          name: body.name ?? 'Untitled',
          role: 'admin',
          createdAt: new Date(Date.UTC(2026, 5, 2 + store.length)).toISOString(),
        };
        store.push(created);
        return jsonResponse(created, 201);
      }
      const params = new URL(url, 'http://local').searchParams;
      const sort = params.get('sort');
      const order = params.get('order');
      const limit = Number(params.get('limit') ?? '100');
      const sorted = store.toSorted((a, b) =>
        sort === 'createdAt'
          ? a.createdAt.localeCompare(b.createdAt)
          : a.name.localeCompare(b.name),
      );
      if (order === 'desc') {
        sorted.reverse();
      }
      return jsonResponse({ items: sorted.slice(0, limit), total: store.length, limit, offset: 0 });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
