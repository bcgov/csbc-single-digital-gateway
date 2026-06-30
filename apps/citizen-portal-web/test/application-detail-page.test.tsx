import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

const authedUser = { id: 'c1', roles: ['citizen'], claims: { sub: 'c1', name: 'Amina Ali' } };

const detail = {
  id: 'sub1',
  reference: '20260630-0001',
  status: 'pending',
  statusLabel: 'Submitted',
  formId: 'f1',
  formVersionId: 'fv1',
  formTitle: 'Your Profile',
  serviceId: 'svc-1',
  serviceTitle: 'Birth Registration',
  kind: 'basic-form',
  structure: {
    schema: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
  },
  data: { name: 'Amina' },
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  submittedAt: '2026-06-30T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockBff({ app = jsonResponse(detail), me = jsonResponse(authedUser) } = {}) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return me;
    if (url.includes('/v1/me/applications/sub1')) return app;
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

function renderApp() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/applications/sub1'] }),
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

describe('citizen application detail page', () => {
  it('shows the application, its service, and the submitted answers', async () => {
    mockBff();
    renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Your Profile', level: 1 }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Birth Registration').length).toBeGreaterThan(0);
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(await screen.findByText('Amina')).toBeInTheDocument(); // a submitted answer, read-only
  });

  it('prompts anonymous visitors to log in', async () => {
    mockBff({ me: new Response(null, { status: 401 }) });
    renderApp();
    const link = await screen.findByRole('link', { name: /log in/i }, { timeout: 5000 });
    expect(link).toHaveAttribute('href', expect.stringContaining('/auth/login'));
  });
});
