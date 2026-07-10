/**
 * Browser client + query options for the citizen notification center (feature 115). Talks to
 * the citizen-portal-api proxy (`/v1/me/notifications*`, feature 113) — the browser never
 * reaches notification-service directly. Mutations are credentialed calls (Origin →
 * CSRF-allowlisted), matching the applications.ts idiom.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';

export type NotificationChannel = 'in_app' | 'email';

export interface NotificationFeedItem {
  deliveryId: string;
  notificationId: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationFeed {
  items: NotificationFeedItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface NotificationPreferences {
  userId: string;
  email: string | null;
  channels: { channel: NotificationChannel; enabled: boolean }[];
}

export class RequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BFF_ORIGIN}${path}`, {
    credentials: 'include',
    ...init,
    ...(init?.body ? { headers: { 'content-type': 'application/json', ...init.headers } } : {}),
  });
  if (!res.ok) {
    throw new RequestError(res.status, `${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Everything notification-scoped invalidates under this family. */
export const NOTIFICATIONS_KEY = ['notifications'] as const;

export function notificationFeedQueryOptions() {
  return queryOptions({
    queryKey: [...NOTIFICATIONS_KEY, 'feed'],
    queryFn: () => requestJson<NotificationFeed>('/v1/me/notifications'),
    refetchOnWindowFocus: false,
  });
}

export function unreadCountQueryOptions() {
  return queryOptions({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: () => requestJson<{ count: number }>('/v1/me/notifications/unread-count'),
    // A gentle poll keeps the badge live without websockets; focus-refetch stays off app-wide.
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function notificationPreferencesQueryOptions() {
  return queryOptions({
    queryKey: [...NOTIFICATIONS_KEY, 'preferences'],
    queryFn: () => requestJson<NotificationPreferences>('/v1/me/notification-preferences'),
    refetchOnWindowFocus: false,
  });
}

export function markNotificationRead(deliveryId: string): Promise<NotificationFeedItem> {
  return requestJson(`/v1/me/notifications/${encodeURIComponent(deliveryId)}/read`, {
    method: 'POST',
  });
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return requestJson('/v1/me/notifications/read-all', { method: 'POST' });
}

export interface UpdatePreferencesInput {
  email?: string | null;
  channels?: { channel: NotificationChannel; enabled: boolean }[];
}

export function updateNotificationPreferences(
  input: UpdatePreferencesInput,
): Promise<NotificationPreferences> {
  return requestJson('/v1/me/notification-preferences', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
