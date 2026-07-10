import { useEffect, useState } from 'react';
import { NotificationCenter, type NotificationItem } from '@repo/react/notification-center';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import {
  NOTIFICATIONS_KEY,
  markAllNotificationsRead,
  markNotificationRead,
  notificationFeedQueryOptions,
  subscribeToNotifications,
  unreadCountQueryOptions,
} from '@/lib/notifications';

/**
 * The header bell: app-side wiring of `@repo/react/notification-center` to the BFF proxy
 * (feature 113). Rendered only in the authenticated header variant. No optimistic updates —
 * mutations invalidate the `['notifications']` family and refetch (correctness first).
 *
 * Click navigation (feature 120): the module reports every item click; when the underlying
 * feed item's payload carries a `submissionId` (the review-decision and submission-received
 * events, features 111/112), the click closes the popover and deep-links to that application.
 * Payload-less notifications just mark read.
 */
export function HeaderNotifications() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const feed = useQuery(notificationFeedQueryOptions());
  const unread = useQuery(unreadCountQueryOptions());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });

  // Real-time (feature 125): every SSE event invalidates the family — badge + feed together.
  // This component only renders in the authenticated header, so the subscription lifetime is
  // exactly the signed-in session's; the 30s poll stays as silent fallback.
  useEffect(() => {
    const subscription = subscribeToNotifications(() => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    });
    return () => subscription.close();
  }, [queryClient]);
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });

  const handleItemClick = (item: NotificationItem) => {
    // The module's item is the render subset — resolve the full feed item for its payload.
    const full = feed.data?.items.find((i) => i.deliveryId === item.deliveryId);
    const submissionId = full?.payload?.['submissionId'];
    if (typeof submissionId === 'string' && submissionId !== '') {
      setOpen(false);
      void navigate({ to: '/applications/$id', params: { id: submissionId } });
    }
  };

  return (
    <NotificationCenter
      items={feed.data?.items ?? []}
      unreadCount={unread.data?.count ?? 0}
      loading={feed.isPending}
      open={open}
      onOpenChange={setOpen}
      onMarkRead={(deliveryId) => markRead.mutate(deliveryId)}
      onMarkAllRead={() => markAllRead.mutate()}
      onItemClick={handleItemClick}
      onOpenPreferences={() => {
        setOpen(false);
        void navigate({ to: '/account/notifications' });
      }}
    />
  );
}
