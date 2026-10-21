import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  RequestError,
  notificationFeedQueryOptions,
  unreadCountQueryOptions,
  notificationPreferencesQueryOptions,
  markNotificationRead,
  markAllNotificationsRead,
  updateNotificationPreferences,
  subscribeToNotifications,
} from '@/lib/notifications';
import { BFF_ORIGIN } from '@/lib/bff';
import { createMockSpy } from '../../support/create-mock-spy';

describe('notifications lib', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('RequestError', () => {
    it('Should create RequestError correctly', () => {
      const error = new RequestError(500, 'Internal Server Error');
      expect(error.status).toBe(500);
      expect(error.message).toBe('Internal Server Error');
      expect(error.name).toBe('RequestError');
    });
  });

  describe('query options and fetch helpers', () => {
    it('Should notificationFeedQueryOptions returns correct configuration', async () => {
      const options = notificationFeedQueryOptions();
      expect(options.queryKey).toEqual(['notifications', 'feed']);
      expect(options.refetchOnWindowFocus).toBe(false);

      const mockFeed = { items: [], total: 0, limit: 10, offset: 0 };
      const fetchSpy = createMockSpy(mockFeed);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notifications`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockFeed);
    });

    it('Should unreadCountQueryOptions returns correct configuration', async () => {
      const options = unreadCountQueryOptions();
      expect(options.queryKey).toEqual(['notifications', 'unread-count']);
      expect(options.refetchInterval).toBe(30000);
      expect(options.refetchOnWindowFocus).toBe(false);

      const mockCount = { count: 5 };
      const fetchSpy = createMockSpy(mockCount);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notifications/unread-count`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockCount);
    });

    it('Should notificationPreferencesQueryOptions returns correct configuration', async () => {
      const options = notificationPreferencesQueryOptions();
      expect(options.queryKey).toEqual(['notifications', 'preferences']);
      expect(options.refetchOnWindowFocus).toBe(false);

      const mockPrefs = {
        userId: 'u1',
        email: 'test@example.com',
        channels: [],
      };
      const fetchSpy = createMockSpy(mockPrefs);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notification-preferences`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockPrefs);
    });

    it('Should throw RequestError if response is not ok', async () => {
      const options = notificationFeedQueryOptions();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
      } as Response);

      let thrownError: any = null;
      try {
        await options.queryFn!({} as any);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(RequestError);
      expect(thrownError.status).toBe(400);
      expect(thrownError.message).toBe('GET /v1/me/notifications failed: 400');
    });
  });

  describe('mutations and updates', () => {
    it('Should markNotificationRead sends POST request', async () => {
      const mockItem = { deliveryId: 'd1', notificationId: 'n1', title: 'Test' };
      const fetchSpy = createMockSpy(mockItem);

      const result = await markNotificationRead('d/1'); // with URI encoding check
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notifications/d%2F1/read`, {
        method: 'POST',
        credentials: 'include',
      });
      expect(result).toEqual(mockItem);
    });

    it('Should markAllNotificationsRead sends POST request', async () => {
      const mockResponse = { updated: 3 };
      const fetchSpy = createMockSpy(mockResponse);

      const result = await markAllNotificationsRead();
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      expect(result).toEqual(mockResponse);
    });

    it('Should updateNotificationPreferences sends PUT request', async () => {
      const mockPrefs = {
        userId: 'u1',
        email: 'new@example.com',
        channels: [],
      };
      const fetchSpy = createMockSpy(mockPrefs);

      const input = { email: 'new@example.com' };
      const result = await updateNotificationPreferences(input);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notification-preferences`, {
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify(input),
        headers: { 'content-type': 'application/json' },
      });
      expect(result).toEqual(mockPrefs);
    });
  });

  describe('subscribeToNotifications', () => {
    it('Should no-op when EventSourceCtor is undefined', () => {
      const onEvent = vi.fn();
      const sub = subscribeToNotifications(onEvent, undefined);
      expect(sub.close).toBeTypeOf('function');
      sub.close();
      expect(onEvent).not.toHaveBeenCalled();
    });

    it('Should create EventSource and registers notification listener when EventSourceCtor is defined', () => {
      const onEvent = vi.fn();
      const addEventListenerSpy = vi.fn();
      const closeSpy = vi.fn();

      class MockEventSource {
        url: string;
        options: any;
        constructor(url: string, options: any) {
          this.url = url;
          this.options = options;
        }
        addEventListener = addEventListenerSpy;
        close = closeSpy;
      }

      const sub = subscribeToNotifications(onEvent, MockEventSource as any);
      expect(addEventListenerSpy).toHaveBeenCalledWith('notification', onEvent);

      sub.close();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('Should use global EventSource if no constructor is passed', () => {
      const originalEventSource = globalThis.EventSource;
      const addEventListenerSpy = vi.fn();
      const closeSpy = vi.fn();

      class MockEventSource {
        addEventListener = addEventListenerSpy;
        close = closeSpy;
      }

      globalThis.EventSource = MockEventSource as any;

      try {
        const onEvent = vi.fn();
        const sub = subscribeToNotifications(onEvent);
        expect(addEventListenerSpy).toHaveBeenCalledWith('notification', onEvent);
        sub.close();
        expect(closeSpy).toHaveBeenCalled();
      } finally {
        globalThis.EventSource = originalEventSource;
      }
    });
  });
});

// 126 B1 / 125 B1.
describe('subscribeToNotifications — one stream for all tabs', () => {
  describe('shared', () => {
    it('subscribes through the shared stream on the BFF notification URL, for the notification event', async () => {
      const sources: { url: string; init: unknown; emit: () => void; closed: boolean }[] = [];
      class Source {
        closed = false;
        private listener: (() => void) | undefined;
        constructor(url: string, init: unknown) {
          sources.push(Object.assign(this, { url, init, emit: () => this.listener?.() }) as never);
        }
        addEventListener(name: string, listener: () => void) {
          if (name === 'notification') this.listener = listener;
        }
        close() {
          this.closed = true;
        }
      }
      // One holder at a time, waiters queued — the browser's Web Locks, reduced to what this needs.
      let holder: Promise<void> | undefined;
      const locks = {
        request: (_n: string, _o: unknown, cb: () => Promise<void>) => {
          const run = (holder ?? Promise.resolve()).then(cb);
          holder = run;
          return run;
        },
      };
      const onEvent = [vi.fn(), vi.fn()];
      const tabs = onEvent.map((handler) =>
        subscribeToNotifications(handler, Source as never, {
          locks: locks as never,
          BroadcastChannel,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Two tabs, ONE stream.
      expect(sources).toHaveLength(1);
      expect(sources[0]?.url).toBe(`${BFF_ORIGIN}/v1/me/notifications/stream`);
      expect(sources[0]?.init).toEqual({ withCredentials: true });
      sources[0]!.emit();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(onEvent.map((h) => h.mock.calls.length)).toEqual([1, 1]);
      tabs.forEach((tab) => tab.close());
    });
  });
});
