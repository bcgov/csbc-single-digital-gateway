import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string', title: 'Title' },
    description: { type: 'string', title: 'Description' },
    about: { type: 'object', title: 'About' },
  },
};
const uischema = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: '#/properties/title' },
    { type: 'Control', scope: '#/properties/description' },
    { type: 'Control', scope: '#/properties/about', options: { format: 'richtext' } },
  ],
};

const detail = {
  id: 'svc-1',
  title: 'Service One',
  description: 'Financial support for residents.',
  publishedVersionId: 'ver-3',
  version: 3,
  publishedAt: '2025-01-15T00:00:00.000Z',
  data: { title: 'Service One', description: 'Financial support for residents.' },
  schema,
  uischema,
  applications: [
    {
      id: 'ref-1',
      label: 'Apply online',
      title: 'Your Profile',
      formId: 'f1',
      formVersionId: 'fv1',
      kind: 'basic-form',
      url: null,
    },
    {
      id: 'ref-2',
      label: 'Apply on GOV.UK',
      title: 'Apply on GOV.UK',
      formId: 'ext-1',
      formVersionId: 'extv-1',
      kind: 'external-application',
      url: 'https://gov.uk/apply',
    },
  ],
};

const version = {
  id: 'ver-1',
  serviceId: 'svc-1',
  version: 1,
  status: 'archived',
  title: 'Service One',
  data: { title: 'Service One', description: 'The original copy.' },
  schema,
  uischema,
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

async function renderRoute(path: string) {
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
  return router;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('service detail page', () => {
  it('renders the published service with no version switcher', async () => {
    mockBff();
    await renderRoute('/services/svc-1');
    expect(
      await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Financial support for residents.')).toBeInTheDocument();
    // The detail screen always shows the published version — no affordance to change versions.
    const versionLinks = screen
      .queryAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('/versions/'));
    expect(versionLinks).toHaveLength(0);
  });

  it('renders without description if service has no description', async () => {
    const detailNoDesc = { ...detail, description: '' };
    mockBff({ svc: jsonResponse(detailNoDesc) });
    await renderRoute('/services/svc-1');
    expect(
      await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Financial support for residents.')).not.toBeInTheDocument();
  });

  it('surfaces the application forms in How to apply', async () => {
    mockBff();
    renderRoute('/services/svc-1');
    await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 });
    expect(screen.getByRole('heading', { name: 'How to apply' })).toBeInTheDocument();
    expect(screen.getByText('Your Profile')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apply online' })).toHaveAttribute(
      'href',
      '/services/svc-1/apply/f1',
    );
  });

  it('renders an external method as a "Visit site" link opening the url in a new tab', async () => {
    mockBff();
    renderRoute('/services/svc-1');
    await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 });
    const visit = screen.getByRole('link', { name: 'Visit site' });
    expect(visit).toHaveAttribute('href', 'https://gov.uk/apply');
    expect(visit).toHaveAttribute('target', '_blank');
    expect(visit).toHaveAttribute('rel', 'noopener noreferrer');
    // The external method does NOT link into the in-portal apply flow.
    expect(visit).not.toHaveAttribute('href', expect.stringContaining('/apply/'));
  });

  it('shows a not-available state on 404', async () => {
    mockBff({ svc: new Response(null, { status: 404 }) });
    await renderRoute('/services/missing');
    expect(
      await screen.findByRole('heading', { name: /not available/i }, { timeout: 10000 }),
    ).toBeInTheDocument();
  });
});

describe('service version page', () => {
  it('renders a historical version with its status', async () => {
    mockBff();
    await renderRoute('/services/svc-1/versions/ver-1');
    expect(
      await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('archived')).toBeInTheDocument();
    expect(screen.getByText(/historical version/i)).toBeInTheDocument();
    expect(screen.getByText('The original copy.')).toBeInTheDocument();
  });

  it('shows a not-available state on 404', async () => {
    mockBff({ ver: new Response(null, { status: 404 }) });
    await renderRoute('/services/svc-1/versions/missing');
    expect(
      await screen.findByRole('heading', { name: /not available/i }, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it('redirects the current published version to the canonical service page', async () => {
    mockBff(); // detail.publishedVersionId === 'ver-3'
    const router = await renderRoute('/services/svc-1/versions/ver-3');
    await waitFor(() =>
      expect(router.state.location.pathname.replace(/\/$/, '')).toBe('/services/svc-1'),
    );
    expect(screen.queryByText(/historical version/i)).not.toBeInTheDocument();
  });
});
