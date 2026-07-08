import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  reviewReason: null as string | null,
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  submittedAt: '2026-06-30T00:00:00.000Z' as string | null,
};

/** A detail fixture with status/reason overrides. */
const detailWith = (over: Partial<typeof detail>) => ({ ...detail, ...over });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockBff({ app = jsonResponse(detail), me = jsonResponse(authedUser) } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    // Clone the captured responses — a Response body is single-use, and the detail is re-fetched
    // (e.g. invalidateQueries after revise), so the same object would be consumed twice.
    if (url.includes('/auth/me')) return me.clone();
    // Revise: open a draft revision seeded from the prior answers.
    if (url.includes('/v1/me/applications/sub1/revise') && method === 'POST') {
      return jsonResponse({
        id: 'sub1',
        formId: 'f1',
        formVersionId: 'fv1',
        status: 'draft',
        data: { name: 'Amina' },
        reference: '20260630-0001',
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        submittedAt: null,
      });
    }
    if (url.includes('/v1/me/applications/sub1/submit') && method === 'POST') {
      return jsonResponse({ id: 'sub1', status: 'pending', reference: '20260630-0001' });
    }
    if (url.includes('/v1/me/applications/sub1')) return app.clone(); // GET detail + PATCH save
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
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

  it('shows an "Action needed" banner with the reviewer reason and a Make changes action', async () => {
    mockBff({
      app: jsonResponse(
        detailWith({
          status: 'needs_changes',
          statusLabel: 'Action needed',
          reviewReason: 'Please attach proof of address.',
          submittedAt: null,
        }),
      ),
    });
    renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Your Profile', level: 1 }, { timeout: 5000 }),
    ).toBeInTheDocument();
    // The status-aware banner names the state and surfaces the reviewer's note.
    expect(screen.getByText('Action needed')).toBeInTheDocument();
    expect(screen.getByText(/proof of address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /make changes/i })).toBeInTheDocument();
  });

  it('shows an approved banner with descriptive copy', async () => {
    mockBff({ app: jsonResponse(detailWith({ status: 'approved', statusLabel: 'Approved' })) });
    renderApp();
    await screen.findByRole('heading', { name: 'Your Profile', level: 1 }, { timeout: 5000 });
    // Banner-specific copy (distinct from the plain status label) — not present pre-feature.
    expect(screen.getByText(/this application has been approved/i)).toBeInTheDocument();
  });

  it('revises an action-needed application: opens a draft and shows the editable form', async () => {
    const fetchMock = mockBff({
      app: jsonResponse(
        detailWith({
          status: 'needs_changes',
          statusLabel: 'Action needed',
          reviewReason: 'Please fix your name.',
          submittedAt: null,
        }),
      ),
    });
    renderApp();
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: /make changes/i }, { timeout: 5000 }));
    // Mounts the editable FormRunner (its Resubmit button only exists in edit mode)…
    expect(
      await screen.findByRole('button', { name: /resubmit application/i }, { timeout: 15000 }),
    ).toBeInTheDocument();
    // …after calling the revise endpoint.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/me/applications/sub1/revise'),
      expect.objectContaining({ method: 'POST' }),
    );
  }, 20000);
});
