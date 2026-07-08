import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

const authedUser = { id: 'c1', roles: ['citizen'], claims: { sub: 'c1', name: 'Amina Ali' } };

const form = {
  serviceId: 'svc-1',
  formId: 'f1',
  formVersionId: 'fv1',
  kind: 'basic-form',
  title: 'Your Profile',
  structure: {
    schema: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
  },
};

const draft = {
  id: 'sub1',
  formId: 'f1',
  formVersionId: 'fv1',
  status: 'draft',
  data: {},
  reference: '20260630-0001',
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  submittedAt: null,
};

const submitted = { ...draft, status: 'pending', submittedAt: '2026-06-30T00:00:00.000Z' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockBff({ me = jsonResponse(authedUser) } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.includes('/auth/me')) return me;
    if (url.includes('/v1/me/services/') && url.endsWith('/agreements'))
      return jsonResponse({ items: [] });
    if (url.includes('/v1/services/') && url.includes('/applications/')) return jsonResponse(form);
    if (url.includes('/v1/me/applications') && url.endsWith('/submit'))
      return jsonResponse(submitted);
    if (method === 'POST' && url.endsWith('/v1/me/applications')) return jsonResponse(draft);
    if (method === 'PATCH') return jsonResponse(draft);
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderApply() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/services/svc-1/apply/f1'] }),
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

describe('citizen application page', () => {
  it('lets an authenticated citizen fill and submit, then confirms', async () => {
    const fetchMock = mockBff();
    const user = userEvent.setup();
    renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }, { timeout: 5000 }),
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Submit application' }));

    expect(
      await screen.findByRole('heading', { name: 'Application submitted' }),
    ).toBeInTheDocument();
    expect(screen.getByText('20260630-0001')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/me/applications/sub1/submit'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('prompts anonymous visitors to log in', async () => {
    mockBff({ me: new Response(null, { status: 401 }) });
    renderApply();
    const link = await screen.findByRole('link', { name: /log in to apply/i }, { timeout: 5000 });
    expect(link).toHaveAttribute('href', expect.stringContaining('/auth/login'));
  });
});
