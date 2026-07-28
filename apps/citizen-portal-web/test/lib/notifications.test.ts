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

describe('notifications lib', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('RequestError', () => {
    it('creates RequestError correctly', () => {
      const error = new RequestError(500, 'Internal Server Error');
      expect(error.status).toBe(500);
      expect(error.message).toBe('Internal Server Error');
      expect(error.name).toBe('RequestError');
    });
  });

  describe('query options and fetch helpers', () => {
    it('notificationFeedQueryOptions returns correct configuration', async () => {
      const options = notificationFeedQueryOptions();
      expect(options.queryKey).toEqual(['notifications', 'feed']);
      expect(options.refetchOnWindowFocus).toBe(false);

      const mockFeed = { items: [], total: 0, limit: 10, offset: 0 };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockFeed,
      } as Response);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notifications`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockFeed);
    });

    it('unreadCountQueryOptions returns correct configuration', async () => {
      const options = unreadCountQueryOptions();
      expect(options.queryKey).toEqual(['notifications', 'unread-count']);
      expect(options.refetchInterval).toBe(30000);
      expect(options.refetchOnWindowFocus).toBe(false);

      const mockCount = { count: 5 };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockCount,
      } as Response);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notifications/unread-count`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockCount);
    });

    it('notificationPreferencesQueryOptions returns correct configuration', async () => {
      const options = notificationPreferencesQueryOptions();
      expect(options.queryKey).toEqual(['notifications', 'preferences']);
      expect(options.refetchOnWindowFocus).toBe(false);

      const mockPrefs = {
        userId: 'u1',
        email: 'test@example.com',
        channels: [],
      };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockPrefs,
      } as Response);

      const result = await options.queryFn!({} as any);
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notification-preferences`, {
        credentials: 'include',
      });
      expect(result).toEqual(mockPrefs);
    });

    it('throws RequestError if response is not ok', async () => {
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
    it('markNotificationRead sends POST request', async () => {
      const mockItem = { deliveryId: 'd1', notificationId: 'n1', title: 'Test' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockItem,
      } as Response);

      const result = await markNotificationRead('d/1'); // with URI encoding check
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notifications/d%2F1/read`, {
        method: 'POST',
        credentials: 'include',
      });
      expect(result).toEqual(mockItem);
    });

    it('markAllNotificationsRead sends POST request', async () => {
      const mockResponse = { updated: 3 };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await markAllNotificationsRead();
      expect(fetchSpy).toHaveBeenCalledWith(`${BFF_ORIGIN}/v1/me/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      expect(result).toEqual(mockResponse);
    });

    it('updateNotificationPreferences sends PUT request', async () => {
      const mockPrefs = {
        userId: 'u1',
        email: 'new@example.com',
        channels: [],
      };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockPrefs,
      } as Response);

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
    it('no-ops when EventSourceCtor is undefined', () => {
      const onEvent = vi.fn();
      const sub = subscribeToNotifications(onEvent, undefined);
      expect(sub.close).toBeTypeOf('function');
      sub.close();
      expect(onEvent).not.toHaveBeenCalled();
    });

    it('creates EventSource and registers notification listener when EventSourceCtor is defined', () => {
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

    it('uses global EventSource if no constructor is passed', () => {
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
