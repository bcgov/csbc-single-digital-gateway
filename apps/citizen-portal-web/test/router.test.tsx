import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { routeTree } from '@/routeTree.gen';

describe('citizen-portal-web router', () => {
  it('resolves the landing route at /', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
    expect(
      await screen.findByRole('heading', { name: 'Hello, citizen-portal-web.' }),
    ).toBeInTheDocument();
  });
});
