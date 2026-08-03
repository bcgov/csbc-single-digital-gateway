import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  notificationFeedQueryOptions,
  unreadCountQueryOptions,
  notificationPreferencesQueryOptions,
  markNotificationRead,
  markAllNotificationsRead,
  updateNotificationPreferences,
  subscribeToNotifications,
  RequestError,
} from '@/lib/notifications';

// Mock BFF origin
vi.mock('@/lib/bff', () => ({
  BFF_ORIGIN: 'http://bff-test',
}));

const mockResponse = (status: number, data: any, okState = true) => {
  return {
    ok: okState,
    status,
    json: () => Promise.resolve(data),
  } as Response;
};

describe('Notifications Unit Test Suite', () => {
  const mockFetch = vi.fn();
  globalThis.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('queries notification feed with query options', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { items: [{ deliveryId: 'd-1', title: 'Welcome' }] }),
    );

    const options = notificationFeedQueryOptions();
    expect(options.queryKey).toEqual(['notifications', 'feed']);

    const feed = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/me/notifications', {
      credentials: 'include',
    });
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]?.title).toBe('Welcome');
  });

  it('queries unread count with query options', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { count: 5 }));

    const options = unreadCountQueryOptions();
    expect(options.queryKey).toEqual(['notifications', 'unread-count']);

    const res = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/me/notifications/unread-count', {
      credentials: 'include',
    });
    expect(res.count).toBe(5);
  });

  it('queries preferences with query options', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { userId: 'u-1', email: 'test@example.com', channels: [] }),
    );

    const options = notificationPreferencesQueryOptions();
    expect(options.queryKey).toEqual(['notifications', 'preferences']);

    const prefs = await (options.queryFn as any)();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/me/notification-preferences', {
      credentials: 'include',
    });
    expect(prefs.email).toBe('test@example.com');
  });

  it('marks a notification as read', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { deliveryId: 'd-1', readAt: '2026-07-07T00:00:00.000Z' }),
    );

    const result = await markNotificationRead('d-1');
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/me/notifications/d-1/read', {
      credentials: 'include',
      method: 'POST',
    });
    expect(result.readAt).toBe('2026-07-07T00:00:00.000Z');
  });

  it('marks all notifications as read', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { updated: 3 }));

    const result = await markAllNotificationsRead();
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/me/notifications/read-all', {
      credentials: 'include',
      method: 'POST',
    });
    expect(result.updated).toBe(3);
  });

  it('updates notification preferences', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, { userId: 'u-1', email: 'new@example.com', channels: [] }),
    );

    const result = await updateNotificationPreferences({ email: 'new@example.com' });
    expect(mockFetch).toHaveBeenCalledWith('http://bff-test/v1/me/notification-preferences', {
      credentials: 'include',
      method: 'PUT',
      body: JSON.stringify({ email: 'new@example.com' }),
      headers: {
        'content-type': 'application/json',
      },
    });
    expect(result.email).toBe('new@example.com');
  });

  it('throws RequestError on non-ok responses', async () => {
    mockFetch.mockResolvedValue(mockResponse(400, 'Bad Request', false));

    let thrown: RequestError | undefined;
    try {
      await markAllNotificationsRead();
    } catch (err) {
      thrown = err as RequestError;
    }

    expect(thrown).toBeInstanceOf(RequestError);
    expect(thrown?.status).toBe(400);
    expect(thrown?.message).toContain('POST /v1/me/notifications/read-all failed: 400');
  });

  it('throws RequestError with GET method when feed query fails', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, 'Internal Server Error', false));

    const options = notificationFeedQueryOptions();
    let thrown: RequestError | undefined;
    try {
      await (options.queryFn as any)();
    } catch (err) {
      thrown = err as RequestError;
    }

    expect(thrown).toBeInstanceOf(RequestError);
    expect(thrown?.status).toBe(500);
    expect(thrown?.message).toContain('GET /v1/me/notifications failed: 500');
  });

  it('subscribes to live notifications using EventSource', () => {
    const mockAddEventListener = vi.fn();
    const mockClose = vi.fn();

    class MockEventSource {
      constructor(
        public url: string,
        public options?: any,
      ) {}
      addEventListener = mockAddEventListener;
      close = mockClose;
    }

    const onEvent = vi.fn();
    const subscription = subscribeToNotifications(onEvent, MockEventSource as any);

    expect(mockAddEventListener).toHaveBeenCalledWith('notification', onEvent);

    subscription.close();
    expect(mockClose).toHaveBeenCalled();
  });

  it('covers subscribeToNotifications with global EventSource defined', () => {
    const originalEventSource = globalThis.EventSource;
    const mockClose = vi.fn();
    const mockAddEventListener = vi.fn();
    const mockCtor = vi.fn();

    class MockEventSource {
      constructor(
        public url: string,
        public options?: any,
      ) {
        mockCtor(url, options);
      }
      addEventListener = mockAddEventListener;
      close = mockClose;
    }

    globalThis.EventSource = MockEventSource as any;
    try {
      const onEvent = vi.fn();
      const sub = subscribeToNotifications(onEvent);

      expect(mockCtor).toHaveBeenCalledWith('http://bff-test/v1/me/notifications/stream', {
        withCredentials: true,
      });
      expect(mockAddEventListener).toHaveBeenCalledWith('notification', onEvent);

      sub.close();
      expect(mockClose).toHaveBeenCalled();
    } finally {
      globalThis.EventSource = originalEventSource;
    }
  });

  it('gracefully handles undefined EventSource constructor', () => {
    const onEvent = vi.fn();
    const subscription = subscribeToNotifications(onEvent, undefined);
    expect(() => subscription.close()).not.toThrow();
  });
});
