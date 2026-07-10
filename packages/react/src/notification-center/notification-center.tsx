import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/popover';

import { NotificationBell } from './notification-bell';
import { NotificationPanel } from './notification-panel';
import type { NotificationItem } from './types';

export interface NotificationCenterProps {
  items: NotificationItem[];
  unreadCount: number;
  loading?: boolean | undefined;
  onMarkRead: (deliveryId: string) => void;
  onMarkAllRead: () => void;
  /** Fired on every item click after the mark-read intent — the app decides if it navigates. */
  onItemClick?: ((item: NotificationItem) => void) | undefined;
  onOpenPreferences?: (() => void) | undefined;
  /** Controlled open state (optional — uncontrolled by default). */
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Injectable clock for deterministic relative timestamps in tests. */
  now?: Date | undefined;
}

/**
 * The composed notification center: bell trigger + popover feed. Props-driven — the consuming
 * app owns fetching and mutations (see the feature-113 BFF contract).
 */
export function NotificationCenter({
  items,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onItemClick,
  onOpenPreferences,
  open,
  onOpenChange,
  now,
}: NotificationCenterProps) {
  return (
    <Popover
      {...(open !== undefined && { open })}
      {...(onOpenChange !== undefined && { onOpenChange })}
    >
      <PopoverTrigger render={<NotificationBell count={unreadCount} />} />
      <PopoverContent align="end" className="w-96 gap-0 p-0">
        <NotificationPanel
          items={items}
          loading={loading}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
          onItemClick={onItemClick}
          onOpenPreferences={onOpenPreferences}
          now={now}
        />
      </PopoverContent>
    </Popover>
  );
}
