import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsMenu } from '@/components/console/notifications-menu';
import { QueryClient, QueryClientProvider, queryOptions } from '@tanstack/react-query';
import { authedUser, renderApp } from '../../../support/render-app';

const mockNavigate = vi.fn();
const sse = vi.hoisted(() => ({
  onEvent: null as null | (() => void),
  isIntegrationTest: false,
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => {
      if (sse.isIntegrationTest) {
        return actual.useNavigate();
      }
      return mockNavigate;
    },
  };
});

let mockFeedItems = [
  {
    deliveryId: 'd-1',
    notificationId: 'n-1',
    type: 'submission_assignment',
    title: 'Assigned',
    body: 'Description',
    createdAt: '2026-07-07T00:00:00.000Z',
    readAt: null,
    payload: {
      submissionId: 'sub-123',
      workspaceSlug: 'riverton',
    },
  },
  {
    deliveryId: 'd-2',
    notificationId: 'n-2',
    type: 'other',
    title: 'Other notification',
    body: 'No payload',
    createdAt: '2026-07-07T00:00:00.000Z',
    readAt: null,
    payload: null,
  },
];

let capturedOnEvent: (() => void) | undefined;
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();

vi.mock('@/lib/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications')>();
  return {
    ...actual,
    NOTIFICATIONS_KEY: ['notifications'],
    notificationFeedQueryOptions: () => {
      if (sse.isIntegrationTest) {
        return actual.notificationFeedQueryOptions();
      }
      return queryOptions({
        queryKey: ['notifications', 'feed'],
        queryFn: () => Promise.resolve({ items: mockFeedItems, total: 2, limit: 10, offset: 0 }),
      });
    },
    unreadCountQueryOptions: () => {
      if (sse.isIntegrationTest) {
        return actual.unreadCountQueryOptions();
      }
      return queryOptions({
        queryKey: ['notifications', 'unread-count'],
        queryFn: () => Promise.resolve({ count: 2 }),
      });
    },
    subscribeToNotifications: (onEvent: any) => {
      capturedOnEvent = onEvent;
      sse.onEvent = onEvent;
      if (sse.isIntegrationTest) {
        return actual.subscribeToNotifications(onEvent);
      }
      return {
        close: vi.fn(),
      };
    },
    markNotificationRead: (deliveryId: string) => {
      if (sse.isIntegrationTest) {
        return actual.markNotificationRead(deliveryId);
      }
      return mockMarkRead(deliveryId);
    },
    markAllNotificationsRead: () => {
      if (sse.isIntegrationTest) {
        return actual.markAllNotificationsRead();
      }
      return mockMarkAllRead();
    },
  };
});

vi.mock('@repo/react/notification-center', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    NotificationCenter: (props: any) => {
      if (sse.isIntegrationTest) {
        return <actual.NotificationCenter {...props} />;
      }
      return (
        <div data-testid="mock-notification-center">
          <button data-testid="btn-mark-read" onClick={() => props.onMarkRead('d-1')}>
            Mark Read
          </button>
          <button data-testid="btn-mark-all-read" onClick={() => props.onMarkAllRead()}>
            Mark All Read
          </button>
          <button
            data-testid="btn-item-click-valid"
            onClick={() => props.onItemClick({ deliveryId: 'd-1' })}
          >
            Item Click Valid
          </button>
          <button
            data-testid="btn-item-click-invalid"
            onClick={() => props.onItemClick({ deliveryId: 'd-2' })}
          >
            Item Click Invalid
          </button>
          <button data-testid="btn-open-prefs" onClick={() => props.onOpenPreferences()}>
            Open Prefs
          </button>
          <div data-testid="items-list">{JSON.stringify(props.items)}</div>
        </div>
      );
    },
  };
});

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

describe('NotificationsMenu Component Test Suite', () => {
  describe('NotificationsMenu', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
      vi.clearAllMocks();
      mockMarkRead.mockResolvedValue({});
      mockMarkAllRead.mockResolvedValue({});
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
    });

    const renderComponent = (props?: { disabled?: boolean }) => {
      return render(
        <QueryClientProvider client={queryClient}>
          <NotificationsMenu {...props} />
        </QueryClientProvider>,
      );
    };

    it('renders disabled trigger when disabled prop is true', () => {
      renderComponent({ disabled: true });

      const triggerBtn = screen.getByRole('button', { name: 'Notifications' });
      expect(triggerBtn).toBeInTheDocument();
      expect(triggerBtn).toBeDisabled();
      expect(screen.queryByTestId('mock-notification-center')).not.toBeInTheDocument();
    });

    it('renders the mock notification center by default', () => {
      renderComponent();
      expect(screen.getByTestId('mock-notification-center')).toBeInTheDocument();
    });

    it('invalidates queries when subscribeToNotifications receives an event', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      renderComponent();

      expect(capturedOnEvent).toBeDefined();
      capturedOnEvent!();

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['submissions'] });
    });

    it('triggers markRead mutation when onMarkRead is called', async () => {
      renderComponent();

      const btn = screen.getByTestId('btn-mark-read');
      await userEvent.click(btn);

      expect(mockMarkRead).toHaveBeenCalledWith('d-1');
    });

    it('triggers markAllRead mutation when onMarkAllRead is called', async () => {
      renderComponent();

      const btn = screen.getByTestId('btn-mark-all-read');
      await userEvent.click(btn);

      expect(mockMarkAllRead).toHaveBeenCalled();
    });

    it('navigates to submission detail when onItemClick is called with valid payload', async () => {
      renderComponent();

      const btn = screen.getByTestId('btn-item-click-valid');
      await userEvent.click(btn);

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/app/$slug/submissions/$id',
        params: { slug: 'riverton', id: 'sub-123' },
      });
    });

    it('does not navigate when onItemClick is called with missing or invalid payload', async () => {
      renderComponent();

      const btn = screen.getByTestId('btn-item-click-invalid');
      await userEvent.click(btn);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to preferences account page when onOpenPreferences is called', async () => {
      renderComponent();

      const btn = screen.getByTestId('btn-open-prefs');
      await userEvent.click(btn);

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/app/account',
      });
    });
  });

  describe('console notifications bell', () => {
    beforeEach(() => {
      sse.isIntegrationTest = true;
    });

    afterEach(() => {
      sse.isIntegrationTest = false;
    });
    it('shows the unread badge for a signed-in staff member', async () => {
      mockBff();
      renderApp('/app/riverton');
      expect(
        await screen.findByRole('button', { name: 'Notifications — 1 unread' }, { timeout: 32000 }),
      ).toBeInTheDocument();
    });

    it('invalidates the submission family on a realtime notification event', async () => {
      mockBff();
      const { queryClient } = renderApp('/app/riverton');
      await screen.findByRole('button', { name: 'Notifications — 1 unread' }, { timeout: 32000 });
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
      // Fire the SSE handler the bell registered — the open submission detail must be refreshed.
      sse.onEvent?.();
      await waitFor(() => {
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['submissions'] });
      });
    });

    it('navigates to the workspace review page for a staff payload and marks it read', async () => {
      const user = userEvent.setup();
      const calls = mockBff();
      const { router } = renderApp('/app/riverton');
      const bell = await screen.findByRole(
        'button',
        { name: 'Notifications — 1 unread' },
        { timeout: 32000 },
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
        { timeout: 32000 },
      );
      await user.click(bell);
      await user.click(await screen.findByRole('button', { name: 'No destination here' }));
      expect(router.state.location.pathname).toBe('/app/riverton');
    });
  });
});
