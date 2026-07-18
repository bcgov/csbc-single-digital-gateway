import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Route as documentTypesLayoutRoute } from '@/routes/admin.document-types';

describe('Admin Document Types Layout Route', () => {
  it('renders the child route inside the Outlet', async () => {
    const rootRoute = createRootRoute();

    const indexRoute = createRoute({
      getParentRoute: () => documentTypesLayoutRoute,
      path: '/',
      component: () => <div data-testid="layout-child-content">Child Page</div>,
    });

    const routeTree = rootRoute.addChildren([documentTypesLayoutRoute.addChildren([indexRoute])]);

    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/admin/document-types'] }),
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByTestId('layout-child-content')).toBeInTheDocument();
    expect(screen.getByText('Child Page')).toBeInTheDocument();
  });
});
