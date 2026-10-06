import { screen, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { mockAuth, renderApp } from '../../support/render-app';
import { Route } from '@/routes/admin.document-types';
import { createMockDocumentTypesBff } from '../../support/create-mock-document-types-bff';
import { adminUser } from '../../support/fixtures';

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

describe('Admin Document Types Layout Route Integration Test Suite', () => {
  it('verifies route has a valid component definition for admin document types layout route', () => {
    expect(Route.options.component).toBeDefined();
  });

  it('renders child routes correctly inside the DocumentTypesLayout Outlet', async () => {
    createMockDocumentTypesBff({ items: [] }, mockAuth(adminUser));
    renderApp('/admin/document-types');

    // Asserts that index route content within the layout Outlet mounts successfully
    expect(
      await screen.findByText('No document types yet.', {}, { timeout: 8000 }),
    ).toBeInTheDocument();
  });

  it('renders the layout component directly without crashing for the admin document types layout route', () => {
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
