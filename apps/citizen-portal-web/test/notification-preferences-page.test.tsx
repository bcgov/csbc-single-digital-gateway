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
  email: 'amina@example.com' as string | null,
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

function renderPage(options?: {
  user?: typeof authedUser | null;
  prefs?: typeof PREFS | null;
  errorOnPrefs?: boolean;
  errorOnSave?: boolean;
  authPending?: boolean;
  delaySaveMs?: number;
  delayPrefsMs?: number;
}) {
  const puts: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/auth/me')) {
      if (options?.authPending) {
        return new Promise(() => {});
      }
      if (options?.user === null) {
        return new Response(null, { status: 401 });
      }
      return jsonResponse(options?.user ?? authedUser);
    }
    if (url.includes('/notification-preferences')) {
      if (init?.method === 'PUT') {
        if (options?.delaySaveMs) {
          await new Promise((resolve) => setTimeout(resolve, options.delaySaveMs));
        }
        if (options?.errorOnSave) {
          return new Response(null, { status: 500 });
        }
        puts.push(String(init.body));
        const body = JSON.parse(String(init.body)) as typeof PREFS;
        return jsonResponse({ ...PREFS, ...body });
      }
      if (options?.errorOnPrefs) {
        return new Response(null, { status: 500 });
      }
      if (options?.delayPrefsMs) {
        await new Promise((resolve) => setTimeout(resolve, options.delayPrefsMs));
      }
      return jsonResponse(options?.prefs !== undefined ? options.prefs : PREFS);
    }
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
      await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 }),
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

  it('handles auth pending state', async () => {
    renderPage({ authPending: true });
    // Wait a brief moment and verify that skeletons or page shells are rendered but not the content
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(
      screen.queryByRole('heading', { name: 'Notification settings' }),
    ).not.toBeInTheDocument();
  });

  it('handles unauthenticated user', async () => {
    renderPage({ user: null });
    expect(
      await screen.findByText(
        'You need to be signed in to manage notifications.',
        {},
        { timeout: 10000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Log in' })[0]).toBeInTheDocument();
  });

  it('handles preferences loading state', async () => {
    renderPage({ delayPrefsMs: 500 });
    await screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 });
    // Preferences are still loading, so the form should not be rendered yet.
    expect(screen.queryByLabelText('Contact email')).not.toBeInTheDocument();
  });

  it('handles preferences query failure', async () => {
    renderPage({ errorOnPrefs: true });
    expect(
      await screen.findByText(
        'Notification settings are temporarily unavailable.',
        {},
        { timeout: 10000 },
      ),
    ).toBeInTheDocument();
  });

  it('handles saving preferences failure', async () => {
    const user = userEvent.setup();
    renderPage({ errorOnSave: true });
    const saveButton = await screen.findByRole(
      'button',
      { name: 'Save preferences' },
      { timeout: 10000 },
    );
    await user.click(saveButton);
    expect(
      await screen.findByText('Saving failed — please try again.', {}, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it('shows saving status while saving is in progress', async () => {
    const user = userEvent.setup();
    renderPage({ delaySaveMs: 200 });
    const saveButton = await screen.findByRole(
      'button',
      { name: 'Save preferences' },
      { timeout: 10000 },
    );
    await user.click(saveButton);
    expect(await screen.findByText('Saving…', {}, { timeout: 10000 })).toBeInTheDocument();
    // After it completes, the text goes back to Save preferences
    expect(await screen.findByText('Save preferences', {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it('saves trimmed email and handles null email initial/empty state', async () => {
    const user = userEvent.setup();
    const puts = renderPage({
      prefs: {
        userId: 'c1',
        email: null,
        channels: [
          { channel: 'in_app', enabled: true },
          { channel: 'email', enabled: false },
        ],
      },
    });

    const emailInput = await screen.findByLabelText('Contact email', {}, { timeout: 10000 });
    expect(emailInput).toHaveValue('');

    // Type a spaces-only or blank email
    await user.type(emailInput, '   ');
    await user.click(await screen.findByRole('button', { name: 'Save preferences' }));
    await waitFor(() => {
      expect(puts).toHaveLength(1);
    });
    let body = JSON.parse(puts[0]!) as { email: string | null };
    expect(body.email).toBeNull();

    // Type a real email with extra surrounding spaces to verify trimming
    await user.clear(emailInput);
    await user.type(emailInput, '  john@example.com  ');
    await user.click(await screen.findByRole('button', { name: 'Save preferences' }));
    await waitFor(() => {
      expect(puts).toHaveLength(2);
    });
    body = JSON.parse(puts[1]!) as { email: string | null };
    expect(body.email).toBe('john@example.com');
  });
});
