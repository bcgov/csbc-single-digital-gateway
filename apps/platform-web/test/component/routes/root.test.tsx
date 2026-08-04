import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  createRoute,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Route as rootRoute } from '@/routes/__root';

describe('Root Route', () => {
  it('renders the child route inside the Outlet', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // Create a simple child route to test that Outlet renders children
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <div data-testid="child-content">Hello from Child Route</div>,
    });

    const routeTree = rootRoute.addChildren([indexRoute]);

    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      context: { queryClient },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Hello from Child Route')).toBeInTheDocument();
  });
});
