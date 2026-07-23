import { screen, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { authedUser, mockAuth, renderApp } from '../support/render-app';
import { Route } from '@/routes/admin.document-types';

vi.mock('@/lib/bff', () => {
  const BFF_ORIGIN = 'http://bff-test';
  return {
    BFF_ORIGIN,
    loginUrl: `${BFF_ORIGIN}/auth/login`,
    loginUrlFor: (path: string) => `${BFF_ORIGIN}/auth/login?returnTo=${encodeURIComponent(path)}`,
    getMe: async () => {
      const res = await fetch(`${BFF_ORIGIN}/auth/me`, { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
      return res.json();
    },
    logout: async () => {
      await fetch(`${BFF_ORIGIN}/auth/logout`, { method: 'POST', credentials: 'include' });
    },
    displayName: (user: any) =>
      user.claims.name ?? user.claims.preferred_username ?? user.claims.email ?? user.id,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const adminUser = { ...authedUser, roles: ['admin'] };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockDocumentTypes(items: any[], base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/admin/document-types')) {
      return json({ items });
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('Admin Document Types Layout Route Integration', () => {
  it('verifies route has a valid component definition', () => {
    expect(Route.options.component).toBeDefined();
  });

  it('renders child routes correctly inside the DocumentTypesLayout Outlet', async () => {
    mockDocumentTypes([], mockAuth(adminUser));
    renderApp('/admin/document-types');

    // Asserts that index route content within the layout Outlet mounts successfully
    expect(await screen.findByText('No document types yet.')).toBeInTheDocument();
  });

  it('renders the layout component directly without crashing', () => {
    const Component = Route.options.component;
    if (Component) {
      const rootRoute = createRootRoute();
      const parentRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: Component,
      });
      const routeTree = rootRoute.addChildren([parentRoute]);
      const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/'] }),
      });
      const { container } = render(<RouterProvider router={router} />);
      expect(container).toBeDefined();
    }
  });
});
