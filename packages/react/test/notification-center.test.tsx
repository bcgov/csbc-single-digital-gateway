import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NotificationCenter } from '../src/notification-center';
import { relativeTime } from '../src/notification-center';
import type { NotificationItem } from '../src/notification-center';

const NOW = new Date('2026-07-10T12:00:00Z');
const ITEMS: NotificationItem[] = [
  {
    deliveryId: 'd-unread',
    title: 'Your application was approved',
    body: 'A decision was recorded on application 20260708-4500.',
    createdAt: '2026-07-10T11:55:00Z',
    readAt: null,
  },
  {
    deliveryId: 'd-read',
    title: 'We received your application',
    body: null,
    createdAt: '2026-07-09T12:00:00Z',
    readAt: '2026-07-09T13:00:00Z',
  },
];

function setup(overrides: Partial<Parameters<typeof NotificationCenter>[0]> = {}) {
  const onMarkRead = vi.fn();
  const onMarkAllRead = vi.fn();
  render(
    <NotificationCenter
      items={ITEMS}
      unreadCount={1}
      onMarkRead={onMarkRead}
      onMarkAllRead={onMarkAllRead}
      now={NOW}
      {...overrides}
    />,
  );
  return { onMarkRead, onMarkAllRead };
}

describe('NotificationCenter', () => {
  it('announces the unread count on the bell and shows the badge', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Notifications — 1 unread' })).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens the panel and lists items with relative timestamps', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Your application was approved')).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('fires onMarkRead for an unread item only', async () => {
    const user = userEvent.setup();
    const { onMarkRead } = setup();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    await user.click(
      await screen.findByRole('button', { name: 'Your application was approved (unread)' }),
    );
    expect(onMarkRead).toHaveBeenCalledWith('d-unread');
    await user.click(screen.getByRole('button', { name: 'We received your application' }));
    expect(onMarkRead).toHaveBeenCalledTimes(1);
  });

  it('fires onMarkAllRead and hides the action when nothing is unread', async () => {
    const user = userEvent.setup();
    const { onMarkAllRead } = setup();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    await user.click(await screen.findByRole('button', { name: 'Mark all read' }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state with no items', async () => {
    const user = userEvent.setup();
    setup({ items: [], unreadCount: 0 });
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText('No notifications')).toBeInTheDocument();
  });

  it('renders the settings cog in the header only when onOpenPreferences is provided', async () => {
    const user = userEvent.setup();
    const onOpenPreferences = vi.fn();
    setup({ onOpenPreferences });
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    await user.click(await screen.findByRole('button', { name: 'Notification settings' }));
    expect(onOpenPreferences).toHaveBeenCalledTimes(1);
  });
});

describe('relativeTime', () => {
  it('formats the standard buckets', () => {
    expect(relativeTime('2026-07-10T11:59:40Z', NOW)).toBe('just now');
    expect(relativeTime('2026-07-10T11:55:00Z', NOW)).toBe('5m ago');
    expect(relativeTime('2026-07-10T09:00:00Z', NOW)).toBe('3h ago');
    expect(relativeTime('2026-07-07T12:00:00Z', NOW)).toBe('3d ago');
    expect(relativeTime('not-a-date', NOW)).toBe('');
  });
});
