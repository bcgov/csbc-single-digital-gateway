import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

async function renderRoute(path: string) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes('/v1/me/applications')) return new Response(null, { status: 401 });
    if (String(input).includes('/v1/services')) return jsonResponse({ items: [] });
    if (String(input).includes('/auth/me')) return new Response(null, { status: 401 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('citizen-portal-web router', () => {
  it('resolves the anonymous landing route at /', async () => {
    await renderRoute('/');
    expect(
      await screen.findByRole('heading', { name: 'Access government services online' }),
    ).toBeInTheDocument();
  });

  it('resolves the services catalog route at /services', async () => {
    await renderRoute('/services');
    expect(await screen.findByRole('heading', { name: 'Services', level: 1 })).toBeInTheDocument();
  });
});
