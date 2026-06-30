import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppPage } from '@/components/app-page';

const authedUser = {
  id: 'c1',
  roles: ['citizen'],
  claims: { sub: 'subject-1', preferred_username: 'citizen1', name: 'Amina Ali' },
};

const services = [
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

/** Route the BFF calls a page makes: auth, catalog services, and the user's applications. */
function mockBff({ me = jsonResponse(authedUser), apps = applications } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/auth/me')) return me;
    if (url.includes('/auth/logout')) return new Response(null, { status: 204 });
    if (url.includes('/v1/me/applications')) return jsonResponse({ items: apps });
    if (url.includes('/v1/services')) return jsonResponse({ items: services });
    void init;
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('citizen-portal-web /app page', () => {
  it('greets the authenticated user resolved from GET /auth/me', async () => {
    const fetchMock = mockBff();
    renderWithClient(<AppPage />);
    expect(await screen.findByRole('heading', { name: 'Hi, Amina' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('surfaces the tracked applications from /v1/me/applications', async () => {
    mockBff();
    renderWithClient(<AppPage />);
    await screen.findByRole('heading', { name: 'Hi, Amina' });
    expect(screen.getByRole('heading', { name: 'Track your applications' })).toBeInTheDocument();
    expect((await screen.findAllByText('Birth Registration')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('20250615-0003')).length).toBeGreaterThan(0);
  });

  it('shows the empty applications state when the user has none', async () => {
    mockBff({ apps: [] });
    renderWithClient(<AppPage />);
    await screen.findByRole('heading', { name: 'Hi, Amina' });
    expect(await screen.findByText(/no applications to track/i)).toBeInTheDocument();
  });

  it('shows a login prompt when GET /auth/me returns 401', async () => {
    mockBff({ me: new Response(null, { status: 401 }) });
    renderWithClient(<AppPage />);
    const links = await screen.findAllByRole('link', { name: /log in/i });
    expect(links.some((link) => link.getAttribute('href')?.includes('/auth/login'))).toBe(true);
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument();
  });

  it('posts to /auth/logout from the account menu', async () => {
    const fetchMock = mockBff();
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    });

    const user = userEvent.setup();
    renderWithClient(<AppPage />);

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
