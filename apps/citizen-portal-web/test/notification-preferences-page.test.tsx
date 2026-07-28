import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { preferencesDirty } from '@/components/notification-preferences-page';
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
  return { puts, router };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('notification preferences page', () => {
  it('shows a breadcrumb back to Account settings', async () => {
    renderPage();
    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' }, { timeout: 10000 });
    expect(within(nav).getByRole('link', { name: 'Account settings' })).toHaveAttribute(
      'href',
      '/account',
    );
    // Current page — a non-link crumb marked aria-current.
    expect(within(nav).getByText('Notification settings')).toHaveAttribute('aria-current', 'page');
  });

  it('renders the seeded toggles and hides the contact email until email is on', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 }),
    ).toBeInTheDocument();
    const inApp = await screen.findByRole('switch', { name: 'In-app notifications' });
    expect(inApp).toBeChecked();
    // Base UI Switch exposes disabled state via aria-disabled, not the native attribute.
    expect(inApp).toHaveAttribute('aria-disabled', 'true');
    const emailSwitch = screen.getByRole('switch', { name: 'Email notifications' });
    expect(emailSwitch).not.toBeChecked();
    // Email off → the contact email section is hidden.
    expect(screen.queryByLabelText('Contact email')).not.toBeInTheDocument();
    // Toggling email on reveals the field, pre-filled from the saved preferences.
    await user.click(emailSwitch);
    expect(await screen.findByLabelText('Contact email')).toHaveValue('amina@example.com');
  });

  it('requires a contact email when email notifications are on', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 });
    await user.click(await screen.findByRole('switch', { name: 'Email notifications' }));
    const emailInput = await screen.findByLabelText('Contact email');
    await user.clear(emailInput);
    // Empty required email → error shown and Save disabled.
    expect(screen.getByText(/contact email is required/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save preferences' })).toBeDisabled();
    // Re-entering an email clears the error and re-enables Save.
    await user.type(emailInput, 'new@example.com');
    expect(screen.queryByText(/contact email is required/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save preferences' })).toBeEnabled();
  });

  it('saves toggled channels and the email through the BFF', async () => {
    const user = userEvent.setup();
    const { puts } = renderPage();
    await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 });
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

  it('warns before navigating away with unsaved changes and stays when cancelled', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { router } = renderPage();
    await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 });
    // Make the form dirty.
    await user.click(await screen.findByRole('switch', { name: 'Email notifications' }));
    // Attempt to leave → the blocker prompts; cancelling keeps us on the page. A blocked
    // navigation's promise stays pending, so fire it without awaiting and assert on the prompt.
    void router.navigate({ to: '/' });
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    expect(router.state.location.pathname).toBe('/account/notifications');
  });

  it('does not warn when navigating away with no unsaved changes', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { router } = renderPage();
    await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 });
    // No edits → navigation proceeds without a prompt.
    await router.navigate({ to: '/' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});

describe('preferencesDirty', () => {
  const base = {
    email: 'a@example.com',
    channels: [
      { channel: 'in_app' as const, enabled: true },
      { channel: 'email' as const, enabled: false },
    ],
  };

  it('is false for an identical snapshot (order-independent)', () => {
    expect(
      preferencesDirty(
        { email: 'a@example.com', channels: [base.channels[1]!, base.channels[0]!] },
        base,
      ),
    ).toBe(false);
  });

  it('detects an email change', () => {
    expect(preferencesDirty({ ...base, email: 'b@example.com' }, base)).toBe(true);
  });

  it('detects a channel toggle change', () => {
    expect(
      preferencesDirty(
        {
          email: base.email,
          channels: [
            { channel: 'in_app', enabled: true },
            { channel: 'email', enabled: true },
          ],
        },
        base,
      ),
    ).toBe(true);
  });
});
