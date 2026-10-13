import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  type: 'Form',
  elements: [
    { type: 'Control', scope: '#/properties/title' },
    { type: 'Control', scope: '#/properties/description' },
  ],
};
// The citizen page renders this variant, not `default`.
const variants = {
  default: uischema,
  Citizen: {
    type: 'Form',
    label: 'Service One',
    elements: [
      {
        id: 'sec-1',
        type: 'Section',
        label: 'Overview',
        elements: [{ type: 'Control', scope: '#/properties/description' }],
      },
    ],
  },
};

/**
 * Feature 217: title and description are GENERATED columns on the version and a service renders from its own
 * `content`. Doc 291: `applicationMethods` is absent here, as from an API that predates it — the page treats it as none.
 */
const detail = {
  id: 'svc-1',
  title: 'Service One',
  description: 'Financial support for residents.',
  publishedVersionId: 'ver-3',
  versionNumber: 3,
  publishedAt: '2025-01-15T00:00:00.000Z',
  schema,
  variants,
  data: { description: 'Overview answer text.' },
};

const version = {
  id: 'ver-1',
  serviceId: 'svc-1',
  versionNumber: 1,
  status: 'archived',
  title: 'Service One',
  schema,
  variants,
  data: { description: 'Version one answer.' },
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

  it('renders the citizen variant with an "On this page" entry per Section', async () => {
    mockBff();
    await renderRoute('/services/svc-1');
    expect(
      await screen.findByRole('heading', { name: 'Overview', level: 2 }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Overview answer text.')).toBeInTheDocument();
    // The variant's own title is not drawn under the page's.
    expect(screen.getAllByRole('heading', { name: 'Service One', level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '#overview');
    expect(document.getElementById('overview')).toHaveAttribute('data-slot', 'section');
  });

  it('renders without description if service has no description', async () => {
    const detailNoDesc = { ...detail, description: null };
    mockBff({ svc: jsonResponse(detailNoDesc) });
    await renderRoute('/services/svc-1');
    expect(
      await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Financial support for residents.')).not.toBeInTheDocument();
  });

  it('disables the call to action when the service lists no application method (doc 291)', async () => {
    mockBff();
    await renderRoute('/services/svc-1');
    await screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 });

    expect(screen.getByRole('button', { name: 'Start an application' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: 'How to apply' })).toBeNull();
  });

  it('falls back to "Service" when the published version has no generated title', async () => {
    mockBff({ svc: jsonResponse({ ...detail, title: null }) });
    await renderRoute('/services/svc-1');

    expect(
      await screen.findByRole('heading', { name: 'Service', level: 1 }, { timeout: 10000 }),
    ).toBeInTheDocument();
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
    // The version renders its OWN content, not the current service's.
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '#overview');
    expect(screen.getByText('Version one answer.')).toBeInTheDocument();
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

// Doc 291.
const T = { timeout: 10000 };
const method = (id: string, title: string) => ({
  id,
  title,
  description: `${title}, start to finish.`,
});
const withMethods = (applicationMethods: unknown[], over: Record<string, unknown> = {}) =>
  jsonResponse({ ...detail, applicationMethods, ...over });

describe('ServiceDetailPage — application methods + side nav (doc 291)', () => {
  describe('side nav (rule 3)', () => {
    it('shows On this page for the Citizen variant Sections', async () => {
      mockBff({ svc: withMethods([]) });
      await renderRoute('/services/svc-1');
      await screen.findByRole('heading', { name: 'Overview', level: 2 }, T);
      const nav = screen.getByRole('link', { name: 'Overview' });
      expect(nav).toHaveAttribute('href', '#overview');
      expect(screen.getByText('On this page')).toBeInTheDocument();
    });
  });

  describe('start an application (rule 9)', () => {
    it('is disabled with a note when there are no methods', async () => {
      mockBff({ svc: withMethods([]) });
      await renderRoute('/services/svc-1');
      await screen.findByRole('heading', { name: 'Service One', level: 1 }, T);
      expect(screen.getByRole('button', { name: 'Start an application' })).toBeDisabled();
      expect(screen.getByText('Applications are not open yet')).toBeInTheDocument();
    });

    it('links straight to the only method', async () => {
      mockBff({ svc: withMethods([method('m1', 'Apply online')]) });
      await renderRoute('/services/svc-1');
      expect(await screen.findByRole('link', { name: 'Start an application' }, T)).toHaveAttribute(
        'href',
        '/services/svc-1/apply/m1',
      );
      expect(screen.queryByText('Applications are not open yet')).toBeNull();
    });

    it('offers a menu of several methods', async () => {
      mockBff({ svc: withMethods([method('m1', 'Apply online'), method('m2', 'Apply by mail')]) });
      await renderRoute('/services/svc-1');
      const trigger = await screen.findByRole('button', { name: 'Start an application' }, T);
      await userEvent.click(trigger);
      const menu = await screen.findByRole('menu');
      const items = within(menu).getAllByRole('menuitem');
      expect(items.map((item) => item.textContent)).toEqual([
        'Apply onlineApply online, start to finish.',
        'Apply by mailApply by mail, start to finish.',
      ]);
      expect(items[1]).toHaveAttribute('href', '/services/svc-1/apply/m2');
    });
  });

  describe('cards (rule 8)', () => {
    it('links method cards to their apply page', async () => {
      const citizen = {
        type: 'Form',
        elements: [
          {
            id: 'sec-apply',
            type: 'Section',
            label: 'How to apply',
            elements: [
              {
                type: 'Control',
                scope: '#/properties/methods',
                options: {
                  component: 'document-reference',
                  documentType: 'services.service-application-method',
                },
              },
            ],
          },
        ],
      };
      const refSchema = {
        type: 'object',
        properties: {
          methods: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id'],
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
          },
        },
      };
      mockBff({
        svc: withMethods([method('m1', 'Apply online')], {
          schema: refSchema,
          variants: { default: citizen, Citizen: citizen },
          // m9 was stored but is not a published method: its card stays unlinked.
          data: {
            methods: [
              { id: 'm1', title: 'Apply online' },
              { id: 'm9', title: 'Retired' },
            ],
          },
        }),
      });
      await renderRoute('/services/svc-1');
      await screen.findByRole('heading', { name: 'How to apply', level: 2 }, T);
      const cards = within(document.querySelector('[data-slot="plain-document-references"]')!);
      expect(cards.getByRole('link', { name: /Apply online/ })).toHaveAttribute(
        'href',
        '/services/svc-1/apply/m1',
      );
      expect(cards.queryByRole('link', { name: /Retired/ })).toBeNull();
      expect(cards.getByText('Retired')).toBeInTheDocument();
    });
  });
});
