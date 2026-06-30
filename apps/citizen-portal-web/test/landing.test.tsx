import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

const authedUser = {
  id: 'c1',
  roles: ['citizen'],
  claims: { sub: 'subject-1', preferred_username: 'citizen1', name: 'Amina Ali' },
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

/** Route the calls the auth-aware home page makes: auth, services, the user's applications. */
function mockBff({ me = new Response(null, { status: 401 }), apps = applications } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return me;
    if (url.includes('/auth/logout')) return new Response(null, { status: 204 });
    if (url.includes('/v1/me/applications')) return jsonResponse({ items: apps });
    if (url.includes('/v1/services')) return jsonResponse({ items: services });
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderHome() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
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

describe('citizen-portal-web home — signed out', () => {
  it('leads with the hero headline and marketing sections', async () => {
    mockBff();
    renderHome();
    expect(
      await screen.findByRole('heading', { name: 'Access government services online' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What you can do' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Available services' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Log in to get started' })).toBeInTheDocument();
  });

  it('offers login links that point at the BFF /auth/login endpoint', async () => {
    mockBff();
    renderHome();
    await screen.findByRole('heading', { name: 'Access government services online' });
    const links = screen.getAllByRole('link', { name: /log in/i });
    expect(links.some((link) => link.getAttribute('href')?.includes('/auth/login'))).toBe(true);
  });

  it('renders services from the catalog and links Services in the nav', async () => {
    mockBff();
    renderHome();
    expect(
      await screen.findByRole('link', { name: /Income and Disability Assistance/i }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'Services' })).toHaveAttribute(
      'href',
      '/services',
    );
  });
});

describe('citizen-portal-web home — signed in', () => {
  it('greets the citizen and tracks their applications', async () => {
    mockBff({ me: jsonResponse(authedUser) });
    renderHome();
    expect(await screen.findByRole('heading', { name: 'Hi, Amina' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Track your applications' })).toBeInTheDocument();
    expect(await screen.findByText('Birth Registration application')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Access government services online' })).toBeNull();
  });

  it('shows the empty applications state when there are none', async () => {
    mockBff({ me: jsonResponse(authedUser), apps: [] });
    renderHome();
    await screen.findByRole('heading', { name: 'Hi, Amina' });
    expect(await screen.findByText(/no applications to track/i)).toBeInTheDocument();
  });

  it('logs out from the account menu', async () => {
    const fetchMock = mockBff({ me: jsonResponse(authedUser) });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    });
    const user = userEvent.setup();
    renderHome();

    await user.click(await screen.findByRole('button', { name: /account menu/i }));
    await user.click(await screen.findByRole('menuitem', { name: /log out/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      ),
    );
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
  });
});
