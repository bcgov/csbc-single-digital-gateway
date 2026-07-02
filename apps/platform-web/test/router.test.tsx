import { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { routeTree } from '@/routeTree.gen';

describe('platform-web router', () => {
  it('resolves the landing route at /', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      context: { queryClient: new QueryClient() },
    });
    render(<RouterProvider router={router} />);
    expect(
      await screen.findByRole('heading', { name: 'Single Digital Gateway Platform' }),
    ).toBeInTheDocument();
  });
});
