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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Render under a fresh QueryClient so the `['auth','me']` cache never bleeds between tests. */
function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('citizen-portal-web /app page', () => {
  it('greets the authenticated user resolved from GET /auth/me', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(authedUser)) as unknown as typeof fetch;

    renderWithClient(<AppPage />);

    expect(await screen.findByRole('heading', { name: 'Hi, Amina' })).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('surfaces the tracked applications and available services', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(authedUser)) as unknown as typeof fetch;

    renderWithClient(<AppPage />);

    await screen.findByRole('heading', { name: 'Hi, Amina' });
    expect(screen.getByRole('heading', { name: 'Track your applications' })).toBeInTheDocument();
    expect(screen.getAllByText('20250615-0003').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Available services' })).toBeInTheDocument();
  });

  it('shows a login prompt when GET /auth/me returns 401', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(null, { status: 401 }),
    ) as unknown as typeof fetch;

    renderWithClient(<AppPage />);

    const links = await screen.findAllByRole('link', { name: /log in/i });
    expect(links.some((link) => link.getAttribute('href')?.includes('/auth/login'))).toBe(true);
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument();
  });

  it('posts to /auth/logout from the account menu', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/auth/me')) return jsonResponse(authedUser);
      return new Response(null, { status: 204 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
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
