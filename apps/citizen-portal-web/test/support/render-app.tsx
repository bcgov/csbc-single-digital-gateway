import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

/**
 * Returns a JSON response with the given body and status.
 * @param body The body of the response.
 * @returns A JSON response.
 */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Build a router over the real route tree, mounted at `path`, with a fresh query context. Pass
 *  `fetchImpl` to stub the BFF calls a specific real page needs; omitted, it falls back to a
 *  baseline stub covering the endpoints most /dev pages touch on mount (anonymous, no services). */
export function renderRoute(path: string, fetchImpl?: typeof fetch) {
  globalThis.fetch = (fetchImpl ??
    (vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/v1/me/applications')) return new Response(null, { status: 401 });
      if (String(input).includes('/v1/services')) return jsonResponse({ items: [] });
      if (String(input).includes('/auth/me')) return new Response(null, { status: 401 });
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch)) as typeof fetch;

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
