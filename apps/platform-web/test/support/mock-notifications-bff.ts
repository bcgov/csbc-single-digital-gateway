import { adminWorkspace, FEED, PREFS } from './fixtures';
import { mockAuthUser } from './mock-auth-user';
import { authedUser, jsonResponse, type MockAuthOptions } from './render-app';
import { vi } from 'vitest';

interface MockNotificationsBffOptions extends MockAuthOptions {
  testFile?: string;
  getError?: boolean;
  putError?: boolean;
  delayGet?: boolean;
  delayPut?: boolean;
  nullEmail?: boolean;
  count?: number;
}

/**
 * Mocks the notification BFF requests.
 * @param options Options to configure the mock.
 * @returns Array of PUT requests to verify the BFF was called.
 */
export function mockNotificationsBff(options: MockNotificationsBffOptions = {}) {
  const mergedOptions = { user: authedUser, workspaces: [adminWorkspace], count: 0, ...options };
  const base = mockAuthUser(mergedOptions.user, mergedOptions);
  const puts: string[] = [];
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/notifications/unread-count')) {
      return jsonResponse({ count: mergedOptions.count });
    }
    if (url.includes('/read-all')) return jsonResponse({ updated: 1 });
    if (url.includes('/read'))
      return jsonResponse({ ...FEED.items[0], readAt: new Date().toISOString() });
    if (url.includes('/v1/me/notifications')) {
      return jsonResponse(FEED);
    }
    if (url.includes('/v1/services')) return jsonResponse({ items: [] });

    if (url.includes('/v1/workspaces/by-slug/')) {
      const slug = decodeURIComponent(url.split('/v1/workspaces/by-slug/')[1]?.split('?')[0] ?? '');
      const workspaces = mergedOptions.workspaces ?? [adminWorkspace];
      const found = workspaces.find((w) => w.slug === slug);
      return found ? jsonResponse(found) : new Response(null, { status: 404 });
    }
    if (url.includes('/v1/workspaces')) {
      return jsonResponse(mergedOptions.workspaces ?? [adminWorkspace]);
    }

    if (url.includes('/notification-preferences')) {
      if (method === 'PUT') {
        if (mergedOptions.delayPut) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
        if (mergedOptions.putError) {
          return new Response(null, { status: 500 });
        }
        const bodyStr = init?.body ? String(init.body) : '';
        puts.push(bodyStr);
        return jsonResponse({ ...PREFS, ...(bodyStr ? JSON.parse(bodyStr) : {}) });
      }

      if (mergedOptions.delayGet) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (mergedOptions.getError) {
        return new Response(null, { status: 500 });
      }
      if (mergedOptions.nullEmail) {
        return jsonResponse({ ...PREFS, email: null });
      }
      return jsonResponse(PREFS);
    }

    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { puts, calls, fetchMock };
}
