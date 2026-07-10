import { Button } from '@repo/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@repo/ui/empty';
import { Separator } from '@repo/ui/separator';
import { SettingsIcon } from 'lucide-react';

import { relativeTime } from './relative-time';
import type { NotificationItem } from './types';

export interface NotificationPanelProps {
  items: NotificationItem[];
  loading?: boolean | undefined;
  /** Fired ONLY for unread items (the module never emits redundant mutations). */
  onMarkRead: (deliveryId: string) => void;
  onMarkAllRead: () => void;
  /** Renders the header settings cog when provided. */
  onOpenPreferences?: (() => void) | undefined;
  /** Injectable clock for deterministic relative timestamps in tests. */
  now?: Date | undefined;
}

/**
 * The notification feed. Pure render + intents: read-state changes, fetching, and pagination
 * live in the consuming app.
 */
export function NotificationPanel({
  items,
  loading = false,
  onMarkRead,
  onMarkAllRead,
  onOpenPreferences,
  now,
}: NotificationPanelProps) {
  const unread = items.filter((item) => item.readAt === null).length;
  return (
    <div className="flex w-full flex-col text-sm">
      <div className="flex items-center justify-between gap-2 py-2 pl-4 pr-3">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <div className="flex shrink-0 items-center gap-1">
          {unread > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={onMarkAllRead}>
              Mark all read
            </Button>
          ) : null}
          {onOpenPreferences !== undefined ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Notification settings"
              onClick={onOpenPreferences}
            >
              <SettingsIcon aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <Separator />
      {loading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground" role="status">
          Loading notifications…
        </p>
      ) : items.length === 0 ? (
        <Empty className="py-8">
          <EmptyHeader>
            <EmptyTitle>No notifications</EmptyTitle>
            <EmptyDescription>Updates about your applications will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="max-h-96 overflow-y-auto" aria-label="Notification list">
          {items.map((item) => {
            const isUnread = item.readAt === null;
            return (
              <li key={item.deliveryId}>
                <button
                  type="button"
                  onClick={() => {
                    if (isUnread) {
                      onMarkRead(item.deliveryId);
                    }
                  }}
                  className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-accent"
                  aria-label={`${item.title}${isUnread ? ' (unread)' : ''}`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${isUnread ? 'bg-primary' : 'bg-transparent'}`}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={`text-sm ${isUnread ? 'font-semibold' : 'font-normal'}`}>
                      {item.title}
                    </span>
                    {item.body !== null && item.body !== '' ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {item.body}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(item.createdAt, now)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
