import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockBff } from '../../support/create-mock-bff';
import { urlCalls } from '../../support/fixtures';
import { renderPage } from '../../support/render-page';

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

const calls = urlCalls;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Header Notification Bell Test Suite', () => {
  it('Should show the unread badge for a signed-in citizen', async () => {
    createMockBff({ services: [], draft: [] });
    renderPage({ path: '/' });
    expect(
      await screen.findByRole('button', { name: 'Notifications — 1 unread' }, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it('Should invalidate the application detail family on a realtime notification event', async () => {
    createMockBff({ services: [], draft: [] });
    const { client } = await renderPage({ path: '/' });
    await screen.findByRole('button', { name: 'Notifications — 1 unread' }, { timeout: 10000 });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    // Fire the SSE handler the bell registered — the open application detail must be refreshed.
    sse.onEvent?.();
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me', 'applications'] });
    });
  });

  it('Should open the feed and marks an item read via the BFF', async () => {
    createMockBff({ services: [], draft: [] });
    const user = userEvent.setup();
    renderPage({ path: '/' });
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

  it('Should navigate to the application page when the notification carries a submissionId', async () => {
    createMockBff({ services: [], draft: [] });
    const user = userEvent.setup();
    const { router } = await renderPage({ path: '/' });
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

  it('Should not navigate for a notification without a destination payload', async () => {
    createMockBff({ services: [], draft: [], calls });
    const user = userEvent.setup();
    const { router } = await renderPage({ path: '/' });
    const bell = await screen.findByRole(
      'button',
      { name: 'Notifications — 1 unread' },
      { timeout: 10000 },
    );
    await user.click(bell);
    await user.click(await screen.findByRole('button', { name: 'No destination here' }));
    expect(router.state.location.pathname).toBe('/');
  });

  it('Should mark all notifications read via the BFF', async () => {
    createMockBff({ services: [], draft: [], calls });
    const user = userEvent.setup();
    renderPage({ path: '/' });
    const bell = await screen.findByRole(
      'button',
      { name: 'Notifications — 1 unread' },
      { timeout: 10000 },
    );
    await user.click(bell);
    const markAllReadBtn = await screen.findByRole('button', { name: 'Mark all read' });
    await user.click(markAllReadBtn);
    await waitFor(() => {
      expect(calls.some((c) => c.includes('POST') && c.includes('/notifications/read-all'))).toBe(
        true,
      );
    });
  });

  it('Should navigate to notifications preferences page on settings click', async () => {
    createMockBff({ services: [], draft: [], calls });
    const user = userEvent.setup();
    const { router } = await renderPage({ path: '/' });
    const bell = await screen.findByRole(
      'button',
      { name: 'Notifications — 1 unread' },
      { timeout: 10000 },
    );
    await user.click(bell);
    const settingsBtn = await screen.findByRole('button', { name: 'Notification settings' });
    await user.click(settingsBtn);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/account/notifications');
    });
  });
});
