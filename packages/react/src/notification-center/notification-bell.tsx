import { Button } from '@repo/ui/button';
import { mdiBell } from '@mdi/js';
import { Icon } from '@mdi/react';
import type { ComponentPropsWithoutRef } from 'react';

export interface NotificationBellProps extends ComponentPropsWithoutRef<typeof Button> {
  /** Unread count shown as a badge (capped visually at 99+). Zero hides the badge. */
  count: number;
}

/**
 * The notification-center trigger: a ghost icon button with an unread badge. Kept a plain
 * button so `PopoverTrigger render={...}` (or any overlay) can wrap it.
 */
export function NotificationBell({ count, ...buttonProps }: NotificationBellProps) {
  const label = count === 0 ? 'Notifications' : `Notifications — ${count} unread`;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      {...buttonProps}
      className={`relative ${buttonProps.className ?? ''}`}
    >
      <Icon path={mdiBell} aria-hidden="true" size="20px" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Button>
  );
}
