import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

// Capture the SSE handler the bell registers so a test can fire a realtime event (the real
// EventSource no-ops in jsdom). Everything else in the module stays real.
const sse = vi.hoisted(() => ({ onEvent: null as null | (() => void) }));
vi.mock('@/lib/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications')>();
  return {
    ...actual,
    subscribeToNotifications: (onEvent: () => void) => {
      sse.onEvent = onEvent;
      return { close: () => {} };
    },
  };
});

const authedUser = {
  id: 'c1',
  roles: ['citizen'],
  claims: { sub: 'subject-1', name: 'Amina Ali', email: 'amina@example.com' },
};

const FEED = {
  items: [
    {
      deliveryId: 'd-1',
      notificationId: 'n-1',
      type: 'application.approved',
      title: 'Your application was approved',
      body: 'A decision was recorded.',
      payload: { submissionId: 'sub-1' },
      createdAt: new Date().toISOString(),
      readAt: null,
    },
    {
      deliveryId: 'd-2',
      notificationId: 'n-2',
      type: 'demo.announcement',
      title: 'No destination here',
      body: null,
      payload: null,
      createdAt: new Date().toISOString(),
      readAt: new Date().toISOString(),
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderHome() {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url.includes('/auth/me')) return jsonResponse(authedUser);
    if (url.includes('/notifications/unread-count')) return jsonResponse({ count: 1 });
    if (url.includes('/read-all')) return jsonResponse({ updated: 1 });
    if (url.includes('/read'))
      return jsonResponse({ ...FEED.items[0], readAt: new Date().toISOString() });
    if (url.includes('/v1/me/notifications')) return jsonResponse(FEED);
    if (url.includes('/v1/services')) return jsonResponse({ items: [] });
    if (url.includes('/v1/me/applications')) return jsonResponse([]);
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
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
  return { calls, router, client };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('header notification bell', () => {
  it('shows the unread badge for a signed-in citizen', async () => {
    renderHome();
    expect(
      await screen.findByRole('button', { name: 'Notifications — 1 unread' }, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it('invalidates the application detail family on a realtime notification event', async () => {
    const { client } = renderHome();
    await screen.findByRole('button', { name: 'Notifications — 1 unread' }, { timeout: 10000 });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    // Fire the SSE handler the bell registered — the open application detail must be refreshed.
    sse.onEvent?.();
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me', 'applications'] });
    });
  });

  it('opens the feed and marks an item read via the BFF', async () => {
    const user = userEvent.setup();
    const { calls } = renderHome();
    const bell = await screen.findByRole(
      'button',
      { name: 'Notifications — 1 unread' },
      { timeout: 10000 },
    );
    await user.click(bell);
    const item = await screen.findByRole('button', {
      name: 'Your application was approved (unread)',
    });
    await user.click(item);
    await waitFor(() => {
      expect(calls.some((c) => c.includes('POST') && c.includes('/notifications/d-1/read'))).toBe(
        true,
      );
    });
  });

  it('navigates to the application page when the notification carries a submissionId', async () => {
    const user = userEvent.setup();
    const { router } = renderHome();
    const bell = await screen.findByRole(
      'button',
      { name: 'Notifications — 1 unread' },
      { timeout: 10000 },
    );
    await user.click(bell);
    await user.click(
      await screen.findByRole('button', { name: 'Your application was approved (unread)' }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/applications/sub-1');
    });
  });

  it('does not navigate for a notification without a destination payload', async () => {
    const user = userEvent.setup();
    const { router } = renderHome();
    const bell = await screen.findByRole(
      'button',
      { name: 'Notifications — 1 unread' },
      { timeout: 10000 },
    );
    await user.click(bell);
    await user.click(await screen.findByRole('button', { name: 'No destination here' }));
    expect(router.state.location.pathname).toBe('/');
  });
});
