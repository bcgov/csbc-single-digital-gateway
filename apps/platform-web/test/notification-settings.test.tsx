import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from './support/render-app';

const PREFS = {
  userId: 'u1',
  email: 'maya.reyes@riverton.gov',
  channels: [
    { channel: 'in_app', enabled: true },
    { channel: 'email', enabled: false },
  ],
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function mockBff() {
  const puts: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/auth/me')) return json(authedUser);
    if (url.includes('/notification-preferences') && init?.method === 'PUT') {
      puts.push(String(init.body));
      return json({ ...PREFS, ...(JSON.parse(String(init.body)) as object) });
    }
    if (url.includes('/notification-preferences')) return json(PREFS);
    if (url.includes('/notifications/unread-count')) return json({ count: 0 });
    if (url.includes('/v1/me/notifications'))
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    if (url.includes('/v1/workspaces')) return json([]);
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  return puts;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('account page notification settings section', () => {
  it('renders seeded toggles and saves changes through the platform BFF', async () => {
    const user = userEvent.setup();
    const puts = mockBff();
    renderApp('/app/account');
    // CardTitle renders a styled div (no heading role) — match by text.
    expect(
      await screen.findByText('Notification settings', undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    const inApp = await screen.findByRole('switch', { name: 'In-app notifications' });
    expect(inApp).toBeChecked();
    // Base UI Switch exposes disabled state via aria-disabled, not the native attribute.
    expect(inApp).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('switch', { name: 'Email notifications' }));
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));
    await waitFor(() => {
      expect(puts).toHaveLength(1);
    });
    const body = JSON.parse(puts[0]!) as { channels: { channel: string; enabled: boolean }[] };
    expect(body.channels).toContainEqual({ channel: 'email', enabled: true });
    expect(body.channels.some((c) => c.channel === 'in_app')).toBe(false);
  });
});
