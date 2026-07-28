import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, cleanup } from '@testing-library/react';
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

function mockBff({
  app = jsonResponse(detail),
  me = jsonResponse(authedUser),
}: {
  app?: Response | Promise<Response>;
  me?: Response | Promise<Response>;
} = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    // Clone the captured responses — a Response body is single-use, and the detail is re-fetched
    // (e.g. invalidateQueries after revise), so the same object would be consumed twice.
    if (url.includes('/auth/me')) {
      return me instanceof Response ? me.clone() : me;
    }
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
    if (url.includes('/v1/me/applications/sub1')) {
      return app instanceof Response ? app.clone() : app;
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

async function renderApp() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/applications/sub1'] }),
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
  cleanup();
  vi.restoreAllMocks();
});

describe('citizen application detail page', () => {
  it('shows the application, its service, and the submitted answers', async () => {
    mockBff();
    await renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Your Profile', level: 1 }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Birth Registration').length).toBeGreaterThan(0);
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    // Answers render as a read-only (disabled) form, so the value is the input's value, not text.
    expect(await screen.findByDisplayValue('Amina')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your answers' })).toBeInTheDocument();
  });

  it('renders a multi-stage form structure correctly', async () => {
    const multiStageDetail = {
      ...detail,
      kind: 'multi-stage-form',
      structure: {
        stages: [
          {
            pages: [
              {
                id: 'page-1',
                name: 'First Page',
                schema: {
                  type: 'object',
                  properties: { firstName: { type: 'string', title: 'First Name' } },
                },
                uischema: {
                  type: 'VerticalLayout',
                  elements: [{ type: 'Control', scope: '#/properties/firstName' }],
                },
              },
            ],
          },
        ],
      },
      data: { firstName: 'MultiStageName' },
    };
    mockBff({ app: jsonResponse(multiStageDetail) });
    await renderApp();
    expect(
      await screen.findByRole('heading', { name: 'First Page', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('MultiStageName')).toBeInTheDocument();
  });

  it('shows not found page if application fetch fails', async () => {
    mockBff({ app: new Response(null, { status: 404 }) });
    await renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Application not found', level: 1 }),
    ).toBeInTheDocument();
  });

  it('prompts anonymous visitors to log in', async () => {
    mockBff({ me: new Response(null, { status: 401 }) });
    await renderApp();
    expect(
      await screen.findByText(
        'You need to be signed in to view this application.',
        {},
        { timeout: 10000 },
      ),
    ).toBeInTheDocument();
    const link = screen
      .getAllByRole('link', { name: /log in/i })
      .find((el) => el.getAttribute('href')?.includes('/auth/login'));
    expect(link).toBeDefined();
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
    await renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Your Profile', level: 1 }, { timeout: 10000 }),
    ).toBeInTheDocument();
    // The status-aware banner names the state and surfaces the reviewer's note.
    expect(screen.getByText('Action needed')).toBeInTheDocument();
    expect(screen.getByText(/proof of address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /make changes/i })).toBeInTheDocument();
  });

  it('shows an approved banner with descriptive copy', async () => {
    mockBff({ app: jsonResponse(detailWith({ status: 'approved', statusLabel: 'Approved' })) });
    renderApp();
    await screen.findByRole('heading', { name: 'Your Profile', level: 1 }, { timeout: 10000 });
    // Banner-specific copy (distinct from the plain status label) — not present pre-feature.
    expect(screen.getByText(/this application has been approved/i)).toBeInTheDocument();
  });

  it('handles draft status with resume and cancel flow', async () => {
    const draftDetail = detailWith({
      status: 'draft',
      statusLabel: 'Draft',
      submittedAt: null,
    });
    mockBff({ app: jsonResponse(draftDetail) });
    const user = userEvent.setup();
    await renderApp();

    const continueBtn = await screen.findByRole('button', { name: 'Continue your application' });
    expect(continueBtn).toBeInTheDocument();

    // Click continue to enter edit mode
    await user.click(continueBtn);
    const cancelBtn = await screen.findByRole('button', { name: 'Cancel' });
    expect(cancelBtn).toBeInTheDocument();

    // Click cancel to exit edit mode
    await user.click(cancelBtn);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue your application' })).toBeInTheDocument();
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
    await renderApp();
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: /make changes/i }, { timeout: 10000 }));
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

  it('exits edit mode on revise form submit', async () => {
    mockBff({
      app: jsonResponse(
        detailWith({
          status: 'needs_changes',
          statusLabel: 'Action needed',
          reviewReason: 'Please fix your name.',
          submittedAt: null,
        }),
      ),
    });
    const user = userEvent.setup();
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /make changes/i }));
    const resubmitBtn = await screen.findByRole('button', { name: /resubmit application/i });
    expect(resubmitBtn).toBeInTheDocument();

    // Click resubmit to submit and exit edit mode
    await user.click(resubmitBtn);
    expect(screen.queryByRole('button', { name: /resubmit application/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /make changes/i })).toBeInTheDocument();
  });

  it('handles multi-stage forms with missing stages, pages, ids, names, schemas, or uischemas', async () => {
    const multiStageWithFallbacks = {
      ...detail,
      kind: 'multi-stage-form',
      structure: {
        stages: [
          {},
          {
            pages: [{}],
          },
        ],
      },
      data: { firstName: 'MultiStageName' },
    };
    mockBff({ app: jsonResponse(multiStageWithFallbacks) });
    await renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Your Profile', level: 1 }),
    ).toBeInTheDocument();
  });

  it('handles multi-stage forms with missing stages property entirely', async () => {
    const multiStageNoStages = {
      ...detail,
      kind: 'multi-stage-form',
      structure: {},
      data: {},
    };
    mockBff({ app: jsonResponse(multiStageNoStages) });
    await renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Your Profile', level: 1 }),
    ).toBeInTheDocument();
  });

  it('handles basic forms with missing schemas or uischemas', async () => {
    const basicNoSchemas = {
      ...detail,
      structure: {},
    };
    mockBff({ app: jsonResponse(basicNoSchemas) });
    await renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Your Profile', level: 1 }),
    ).toBeInTheDocument();
  });

  it('handles auth pending state (renders skeleton loader)', async () => {
    // Pass a promise that never resolves for both me and app to keep auth and app in pending state
    mockBff({
      me: new Promise<Response>(() => {}),
      app: new Promise<Response>(() => {}),
    });
    await renderApp();
    // Verify that the skeleton is displayed rather than the content/login message
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(
      screen.queryByRole('heading', { name: 'Your Profile', level: 1 }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('You need to be signed in to view this application.'),
    ).not.toBeInTheDocument();
  });

  it('handles application loading state when logged in', async () => {
    // me resolves immediately, but app is pending
    mockBff({
      app: new Promise<Response>(() => {}),
    });
    await renderApp();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(
      screen.queryByRole('heading', { name: 'Your Profile', level: 1 }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('You need to be signed in to view this application.'),
    ).not.toBeInTheDocument();
  });

  it('handles application being null with status 200', async () => {
    mockBff({ app: jsonResponse(null) });
    await renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Application not found', level: 1 }),
    ).toBeInTheDocument();
  });

  it('handles auth query failure', async () => {
    mockBff({ me: new Response(null, { status: 500 }) });
    await renderApp();
    expect(
      await screen.findByText(
        'You need to be signed in to view this application.',
        {},
        { timeout: 10000 },
      ),
    ).toBeInTheDocument();
  });
});
