import { NotificationCenter } from '@repo/react/notification-center';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import {
  NOTIFICATIONS_KEY,
  markAllNotificationsRead,
  markNotificationRead,
  notificationFeedQueryOptions,
  unreadCountQueryOptions,
} from '@/lib/notifications';

/**
 * The header bell: app-side wiring of `@repo/react/notification-center` to the BFF proxy
 * (feature 113). Rendered only in the authenticated header variant. No optimistic updates —
 * mutations invalidate the `['notifications']` family and refetch (correctness first).
 */
export function HeaderNotifications() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const feed = useQuery(notificationFeedQueryOptions());
  const unread = useQuery(unreadCountQueryOptions());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });

  return (
    <NotificationCenter
      items={feed.data?.items ?? []}
      unreadCount={unread.data?.count ?? 0}
      loading={feed.isPending}
      onMarkRead={(deliveryId) => markRead.mutate(deliveryId)}
      onMarkAllRead={() => markAllRead.mutate()}
      onOpenPreferences={() => {
        void navigate({ to: '/account/notifications' });
      }}
    />
  );
}
