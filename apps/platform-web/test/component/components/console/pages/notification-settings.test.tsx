import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from '../../../../support/render-app';

const PREFS = {
  userId: 'u1',
  email: 'maya.reyes@riverton.gov',
  channels: [
    { channel: 'in_app', enabled: true },
    { channel: 'email', enabled: false },
  ],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockBff(
  options: {
    getError?: boolean;
    putError?: boolean;
    delayGet?: boolean;
    delayPut?: boolean;
    nullEmail?: boolean;
  } = {},
) {
  const puts: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/auth/me')) return json(authedUser);
    if (url.includes('/notifications/unread-count')) return json({ count: 0 });
    if (url.includes('/v1/me/notifications'))
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    if (url.includes('/v1/workspaces')) return json([]);

    if (url.includes('/notification-preferences')) {
      if (method === 'PUT') {
        if (options.delayPut) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        if (options.putError) {
          return new Response(null, { status: 500 });
        }
        const bodyStr = init?.body ? String(init.body) : '';
        puts.push(bodyStr);
        return json({ ...PREFS, ...(bodyStr ? JSON.parse(bodyStr) : {}) });
      }

      if (options.delayGet) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (options.getError) {
        return new Response(null, { status: 500 });
      }
      if (options.nullEmail) {
        return json({ ...PREFS, email: null });
      }
      return json(PREFS);
    }

    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  return puts;
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Notification Settings Component Test Suite', () => {
  it('renders seeded toggles and saves changes through the platform BFF', async () => {
    const user = userEvent.setup();
    const puts = mockBff();
    renderApp('/app/account');

    // Wait for form to load
    const saveBtn = await screen.findByRole(
      'button',
      { name: 'Save preferences' },
      { timeout: 15000 },
    );
    expect(saveBtn).toBeInTheDocument();

    const inApp = await screen.findByRole('switch', { name: 'In-app notifications' });
    expect(inApp).toBeChecked();
    expect(inApp).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByRole('switch', { name: 'Email notifications' }));
    await user.click(saveBtn);

    await waitFor(() => {
      expect(puts).toHaveLength(1);
    });
    const body = JSON.parse(puts[0]!) as { channels: { channel: string; enabled: boolean }[] };
    expect(body.channels).toContainEqual({ channel: 'email', enabled: true });
    expect(body.channels.some((c) => c.channel === 'in_app')).toBe(false);
  });

  it('allows modifying contact email and trims whitespace', async () => {
    const user = userEvent.setup();
    const puts = mockBff();
    renderApp('/app/account');

    // Wait for form to load
    const saveBtn = await screen.findByRole(
      'button',
      { name: 'Save preferences' },
      { timeout: 15000 },
    );

    const emailInput = screen.getByLabelText(/contact email/i);
    expect(emailInput).toHaveValue('maya.reyes@riverton.gov');

    // Type new email with spaces
    await user.clear(emailInput);
    await user.type(emailInput, '  john@example.com  ');

    await user.click(saveBtn);

    await waitFor(() => {
      expect(puts).toHaveLength(1);
    });

    const body = JSON.parse(puts[0]!) as { email: string | null };
    expect(body.email).toBe('john@example.com');
  });

  it('allows clearing contact email (sets it to null)', async () => {
    const user = userEvent.setup();
    const puts = mockBff();
    renderApp('/app/account');

    // Wait for form to load
    const saveBtn = await screen.findByRole(
      'button',
      { name: 'Save preferences' },
      { timeout: 15000 },
    );

    const emailInput = screen.getByLabelText(/contact email/i);
    await user.clear(emailInput);

    await user.click(saveBtn);

    await waitFor(() => {
      expect(puts).toHaveLength(1);
    });

    const body = JSON.parse(puts[0]!) as { email: string | null };
    expect(body.email).toBeNull();
  });

  it('renders skeleton loader when preferences query is loading', async () => {
    mockBff({ delayGet: true });
    renderApp('/app/account');

    // Loader is active initially, wait for it
    expect(
      await screen.findByText('Notification settings', undefined, { timeout: 15000 }),
    ).toBeInTheDocument();
    // Verify skeleton class is present
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders error card when preferences query fails', async () => {
    mockBff({ getError: true });
    renderApp('/app/account');

    expect(
      await screen.findByText(
        'Notification settings are temporarily unavailable.',
        {},
        { timeout: 15000 },
      ),
    ).toBeInTheDocument();
  });

  it('displays API error alert when saving preferences fails', async () => {
    const user = userEvent.setup();
    mockBff({ putError: true });
    renderApp('/app/account');

    // Wait for form to load
    const saveBtn = await screen.findByRole(
      'button',
      { name: 'Save preferences' },
      { timeout: 15000 },
    );

    await user.click(saveBtn);

    expect(
      await screen.findByText('Saving failed — please try again.', {}, { timeout: 15000 }),
    ).toBeInTheDocument();
  });

  it('disables save button and displays loading text while save is in progress', async () => {
    const user = userEvent.setup();
    mockBff({ delayPut: true });
    renderApp('/app/account');

    // Wait for form to load
    const saveBtn = await screen.findByRole(
      'button',
      { name: 'Save preferences' },
      { timeout: 15000 },
    );
    await user.click(saveBtn);

    // Verify it is disabled and says 'Saving…' during pending
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveTextContent('Saving…');

    // Wait for pending to resolve
    await waitFor(() => {
      expect(saveBtn).toBeEnabled();
      expect(saveBtn).toHaveTextContent('Save preferences');
    });
  });

  it('handles null contact email state on mount', async () => {
    mockBff({ nullEmail: true });
    renderApp('/app/account');

    // Wait for form to load
    await screen.findByRole('button', { name: 'Save preferences' }, { timeout: 15000 });
    const emailInput = screen.getByLabelText(/contact email/i);
    expect(emailInput).toHaveValue('');
  });
});
