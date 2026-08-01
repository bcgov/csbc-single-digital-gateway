import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

const authedUser = {
  id: 'c1',
  roles: ['citizen'],
  claims: { sub: 'subject-1', name: 'Amina Ali' },
};

const services = [
  { id: 's1', title: 'Income and Disability Assistance', description: 'Financial support.' },
  { id: 's2', title: 'Birth Registration', description: 'Register the birth of a child in B.C.' },
];

const applications = [
  {
    id: 'a1',
    serviceId: 's2',
    serviceVersionId: 'v1',
    serviceTitle: 'Birth Registration',
    formTitle: 'Birth Registration application',
    reference: '20250615-0003',
    status: 'in_review',
    statusLabel: 'Review',
    lastUpdated: '2025-06-30T00:00:00.000Z',
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockBff({ me = new Response(null, { status: 401 }), apps = applications } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return me;
    if (url.includes('/v1/me/applications')) return jsonResponse({ items: apps });
    if (url.includes('/v1/services')) return jsonResponse({ items: services });
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

async function renderServices() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/services'] }),
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
  vi.restoreAllMocks();
});

describe('citizen-portal-web /services page', () => {
  it('lists published services from the catalog (anonymous)', async () => {
    mockBff();
    await renderServices();
    expect(await screen.findByRole('heading', { name: 'Services', level: 1 })).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: /Income and Disability Assistance/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Birth Registration/i })).toBeInTheDocument();
  });

  it('does not show "Your applications" for an anonymous visitor', async () => {
    mockBff();
    await renderServices();
    await screen.findByRole('link', { name: /Birth Registration/i });
    expect(screen.queryByRole('heading', { name: 'Your applications' })).not.toBeInTheDocument();
  });

  it('does not show a "Your applications" band on the catalog — even when authenticated', async () => {
    mockBff({ me: jsonResponse(authedUser) });
    renderServices();
    // Wait for the catalog to render, then confirm no application tracking leaked onto this page.
    await screen.findByRole('link', { name: 'Birth Registration' });
    expect(screen.queryByRole('heading', { name: 'Your applications' })).not.toBeInTheDocument();
    expect(screen.queryByText(/20250615-0003/)).not.toBeInTheDocument();
    expect(screen.queryByText('Review')).not.toBeInTheDocument();
  });

  it('renders each catalog card as a service-detail link whose text is only the title', async () => {
    mockBff();
    renderServices();
    const card = await screen.findByRole('link', { name: 'Birth Registration' });
    // The whole card navigates to the service detail...
    expect(card).toHaveAttribute('href', '/services/s2');
    // ...but only the title is the link text (so only the title underlines) — the description is
    // a sibling outside the link and is never part of the underlined link surface.
    expect(card).not.toHaveTextContent(/Register the birth/i);
    expect(screen.getByText(/Register the birth of a child/i)).toBeInTheDocument();
  });

  it('renders the heading and search box above a full-width gold divider (account pattern)', async () => {
    mockBff();
    renderServices();
    const heading = await screen.findByRole('heading', { name: 'Services', level: 1 });
    const search = screen.getByRole('searchbox', { name: /search services/i });

    const divider = document.querySelector('.border-bcgov-gold');
    expect(divider).not.toBeNull();
    // Both the heading and the search box live inside the gold-divided header region.
    expect(divider).toContainElement(heading);
    expect(divider).toContainElement(search);
  });

  it('searches via the catalog endpoint with the q parameter', async () => {
    const fetchMock = mockBff();
    const user = userEvent.setup();
    await renderServices();
    await screen.findByRole('link', { name: /Birth Registration/i });

    await user.type(screen.getByRole('searchbox', { name: /search services/i }), 'birth');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/services?q=birth'),
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
  });

  it('renders "No services found" message when services list is empty', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) return new Response(null, { status: 401 });
      if (url.includes('/v1/me/applications')) return jsonResponse({ items: [] });
      if (url.includes('/v1/services')) return jsonResponse({ items: [] });
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;

    await renderServices();
    expect(await screen.findByText('No services found.')).toBeInTheDocument();
  });

  it('renders "No services found for [query]" message when services list is empty with search', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) return new Response(null, { status: 401 });
      if (url.includes('/v1/me/applications')) return jsonResponse({ items: [] });
      if (url.includes('/v1/services')) return jsonResponse({ items: [] });
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    await renderServices();

    await user.type(screen.getByRole('searchbox', { name: /search services/i }), 'unknown-query');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('No services found for “unknown-query”.')).toBeInTheDocument();
  });
});
