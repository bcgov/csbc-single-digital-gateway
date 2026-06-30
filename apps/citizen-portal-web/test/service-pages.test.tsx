import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

const detail = {
  id: 'svc-1',
  title: 'Service One',
  description: 'Financial support for residents.',
  publishedVersionId: 'ver-3',
  version: 3,
  publishedAt: '2025-01-15T00:00:00.000Z',
  data: { title: 'Service One', description: 'Financial support for residents.' },
};

const version = {
  id: 'ver-1',
  serviceId: 'svc-1',
  version: 1,
  status: 'archived',
  title: 'Service One',
  data: { title: 'Service One', description: 'The original copy.' },
  createdAt: '2024-01-01T00:00:00.000Z',
  publishedAt: null,
  archivedAt: '2024-06-01T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockBff({ svc = jsonResponse(detail), ver = jsonResponse(version) } = {}) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/versions/')) return ver;
    if (/\/v1\/services\/[^?]+$/.test(url)) return svc;
    if (url.includes('/v1/services')) return jsonResponse({ items: [] });
    if (url.includes('/v1/me/applications')) return new Response(null, { status: 401 });
    if (url.includes('/auth/me')) return new Response(null, { status: 401 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

function renderRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
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

describe('service detail page', () => {
  it('renders the service and links to its published version', async () => {
    mockBff();
    renderRoute('/services/svc-1');
    expect(
      await screen.findByRole('heading', { name: 'Service One', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Financial support for residents.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View this version \(v3\)/i })).toHaveAttribute(
      'href',
      '/services/svc-1/versions/ver-3',
    );
  });

  it('shows a not-available state on 404', async () => {
    mockBff({ svc: new Response(null, { status: 404 }) });
    renderRoute('/services/missing');
    expect(await screen.findByRole('heading', { name: /not available/i })).toBeInTheDocument();
  });
});

describe('service version page', () => {
  it('renders a historical version with its status', async () => {
    mockBff();
    renderRoute('/services/svc-1/versions/ver-1');
    expect(
      await screen.findByRole('heading', { name: 'Service One', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('archived')).toBeInTheDocument();
    expect(screen.getByText(/historical version/i)).toBeInTheDocument();
    expect(screen.getByText('The original copy.')).toBeInTheDocument();
  });

  it('shows a not-available state on 404', async () => {
    mockBff({ ver: new Response(null, { status: 404 }) });
    renderRoute('/services/svc-1/versions/missing');
    expect(await screen.findByRole('heading', { name: /not available/i })).toBeInTheDocument();
  });
});
