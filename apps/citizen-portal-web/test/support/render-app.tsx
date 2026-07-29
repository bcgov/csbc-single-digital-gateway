import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/** Build a router over the real route tree, mounted at `path`, with a fresh query context and a
 *  fetch stub covering the BFF endpoints most routes touch on mount. */
export function renderRoute(path: string) {
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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
