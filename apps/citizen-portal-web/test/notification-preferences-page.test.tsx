import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

const authedUser = {
  id: 'c1',
  roles: ['citizen'],
  claims: { sub: 'subject-1', name: 'Amina Ali', email: 'amina@example.com' },
};

const PREFS = {
  userId: 'c1',
  email: 'amina@example.com',
  channels: [
    { channel: 'in_app', enabled: true },
    { channel: 'email', enabled: false },
  ],
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderPage() {
  const puts: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/auth/me')) return jsonResponse(authedUser);
    if (url.includes('/notification-preferences') && init?.method === 'PUT') {
      puts.push(String(init.body));
      const body = JSON.parse(String(init.body)) as typeof PREFS;
      return jsonResponse({ ...PREFS, ...body });
    }
    if (url.includes('/notification-preferences')) return jsonResponse(PREFS);
    if (url.includes('/notifications/unread-count')) return jsonResponse({ count: 0 });
    if (url.includes('/v1/me/notifications')) {
      return jsonResponse({ items: [], total: 0, limit: 20, offset: 0 });
    }
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/account/notifications'] }),
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return puts;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('notification preferences page', () => {
  it('renders the seeded toggles and email', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    const inApp = await screen.findByRole('switch', { name: 'In-app notifications' });
    expect(inApp).toBeChecked();
    // Base UI Switch exposes disabled state via aria-disabled, not the native attribute.
    expect(inApp).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('switch', { name: 'Email notifications' })).not.toBeChecked();
    expect(screen.getByLabelText('Contact email')).toHaveValue('amina@example.com');
  });

  it('saves toggled channels and the email through the BFF', async () => {
    const user = userEvent.setup();
    const puts = renderPage();
    await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 5000 });
    await user.click(await screen.findByRole('switch', { name: 'Email notifications' }));
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));
    await waitFor(() => {
      expect(puts).toHaveLength(1);
    });
    const body = JSON.parse(puts[0]!) as {
      email: string;
      channels: { channel: string; enabled: boolean }[];
    };
    expect(body.email).toBe('amina@example.com');
    expect(body.channels).toContainEqual({ channel: 'email', enabled: true });
    // in_app is mandatory (feature 128) — never sent on the write path.
    expect(body.channels.some((c) => c.channel === 'in_app')).toBe(false);
  });
});
