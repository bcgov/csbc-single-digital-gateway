import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceAgreementMethods } from '@/components/console/services/service-agreement-methods';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-07-08T00:00:00.000Z';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const attachedRef = {
  id: 'ref1',
  agreementDocumentId: 'a-attached',
  agreementVersionId: 'av1',
  title: 'Terms of service',
  isOptional: false,
  isGlobal: false,
  position: 0,
  createdAt: ISO,
};

/** Mock the attached-agreements read + the picker source (published + draft + already-attached). */
function mockFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/versions/sv1/agreements')) {
      return json({ items: [attachedRef] });
    }
    if (url.includes('/v1/service-agreements')) {
      return json({
        items: [
          { ...attachedRef, id: 'a-attached', status: 'published' }, // already attached → excluded
          {
            id: 'a-available',
            workspaceId: null,
            title: 'Privacy policy',
            kind: 'service-agreement',
            createdAt: ISO,
            status: 'published',
            isGlobal: true,
          },
          {
            id: 'a-draft',
            workspaceId: 'w1',
            title: 'Draft notice',
            kind: 'service-agreement',
            createdAt: ISO,
            status: 'draft',
            isGlobal: false,
          },
        ],
      });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderPanel(readonly = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // A minimal router provides the context the panel's useNavigate needs.
  const rootRoute = createRootRoute({
    component: () => (
      <ServiceAgreementMethods
        slug="riverton"
        serviceId="s1"
        versionId="sv1"
        workspaceId="w1"
        readonly={readonly}
      />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('service agreement methods panel', () => {
  it('lists attached agreements: title links to the editor, with Required + Remove', async () => {
    mockFetch();
    renderPanel();
    const link = await screen.findByRole('link', { name: 'Terms of service' });
    expect(link).toHaveAttribute('href', expect.stringContaining('/service-agreements/a-attached'));
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add service agreement/i })).toBeInTheDocument();
  });

  it('the Add modal offers create + attach, and the attach step lists only published, not-attached', async () => {
    mockFetch();
    renderPanel();
    await screen.findByText('Terms of service');
    await userEvent.click(screen.getByRole('button', { name: /add service agreement/i }));
    const dialog = await screen.findByRole('dialog', { name: /add a service agreement/i });
    // Chooser: both options present.
    expect(
      within(dialog).getByRole('button', { name: /create a new agreement/i }),
    ).toBeInTheDocument();
    const attachChoice = within(dialog).getByRole('button', {
      name: /attach an existing agreement/i,
    });
    await userEvent.click(attachChoice);
    // Picker: published + not attached → shown; draft + already-attached → excluded.
    expect(await within(dialog).findByText('Privacy policy')).toBeInTheDocument();
    expect(within(dialog).queryByText('Draft notice')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Terms of service')).not.toBeInTheDocument();
  });

  it('hides the Add and detach affordances when readonly', async () => {
    mockFetch();
    renderPanel(true);
    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add service agreement/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});
