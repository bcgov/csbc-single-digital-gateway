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

function renderPage(me: Response) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return me;
    if (url.includes('/v1/services')) return jsonResponse({ items: [] });
    if (url.includes('/v1/me/applications')) return new Response(null, { status: 401 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/account/service-agreements'] }),
  });
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

describe('citizen-portal-web /account/service-agreements page', () => {
  it('renders the placeholder empty state for a signed-in citizen', async () => {
    renderPage(jsonResponse({ id: 'c1', roles: ['citizen'], claims: { sub: 's1' } }));
    expect(
      await screen.findByRole('heading', { name: 'Service Agreements' }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no service agreements yet/i)).toBeInTheDocument();
  });

  it('prompts an anonymous visitor to log in', async () => {
    renderPage(new Response(null, { status: 401 }));
    const link = await screen.findByRole('link', { name: /log in/i }, { timeout: 10000 });
    expect(link).toHaveAttribute('href', expect.stringContaining('/auth/login'));
  });
});
