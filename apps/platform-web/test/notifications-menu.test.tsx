import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from './support/render-app';

const ISO = '2026-06-01T00:00:00.000Z';
const workspace = { id: 'w1', slug: 'riverton', name: 'Riverton', role: 'admin', createdAt: ISO };

const FEED = {
  items: [
    {
      deliveryId: 'd-staff',
      notificationId: 'n-staff',
      type: 'submission.received',
      title: 'New application received',
      body: 'Application 20260710-AB12 for Income Assistance was submitted and is ready for review.',
      payload: { submissionId: 'sub1', workspaceSlug: 'riverton' },
      createdAt: new Date().toISOString(),
      readAt: null,
    },
    {
      deliveryId: 'd-plain',
      notificationId: 'n-plain',
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockBff() {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url.includes('/auth/me')) return json(authedUser);
    if (url.includes('/v1/workspaces/by-slug/riverton')) return json(workspace);
    if (url.includes('/v1/workspaces')) return json([workspace]);
    if (url.includes('/notifications/unread-count')) return json({ count: 1 });
    if (url.includes('/read-all')) return json({ updated: 1 });
    if (url.includes('/read')) return json({ ...FEED.items[0], readAt: new Date().toISOString() });
    if (url.includes('/v1/me/notifications')) return json(FEED);
    if (url.includes('/v1/submissions/sub1')) return new Response(null, { status: 404 });
    if (url.includes('/v1/submissions')) return json({ items: [] });
    if (url.includes('/v1/services')) return json({ items: [] });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  return calls;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('console notifications bell', () => {
  it('shows the unread badge for a signed-in staff member', async () => {
    mockBff();
    renderApp('/app/riverton');
    expect(
      await screen.findByRole('button', { name: 'Notifications — 1 unread' }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('navigates to the workspace review page for a staff payload and marks it read', async () => {
    const user = userEvent.setup();
    const calls = mockBff();
    const { router } = renderApp('/app/riverton');
    const bell = await screen.findByRole(
      'button',
      { name: 'Notifications — 1 unread' },
      { timeout: 5000 },
    );
    await user.click(bell);
    await user.click(
      await screen.findByRole('button', { name: 'New application received (unread)' }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/riverton/submissions/sub1');
    });
    await waitFor(() => {
      expect(
        calls.some((c) => c.includes('POST') && c.includes('/notifications/d-staff/read')),
      ).toBe(true);
    });
  });

  it('does not navigate for a payload-less notification', async () => {
    const user = userEvent.setup();
    mockBff();
    const { router } = renderApp('/app/riverton');
    const bell = await screen.findByRole(
      'button',
      { name: 'Notifications — 1 unread' },
      { timeout: 5000 },
    );
    await user.click(bell);
    await user.click(await screen.findByRole('button', { name: 'No destination here' }));
    expect(router.state.location.pathname).toBe('/app/riverton');
  });
});
