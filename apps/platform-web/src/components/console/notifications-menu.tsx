import { useEffect, useState } from 'react';
import { NotificationCenter, type NotificationItem } from '@repo/react/notification-center';
import { Button } from '@repo/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Bell } from 'lucide-react';

import {
  NOTIFICATIONS_KEY,
  markAllNotificationsRead,
  markNotificationRead,
  notificationFeedQueryOptions,
  subscribeToNotifications,
  unreadCountQueryOptions,
} from '@/lib/notifications';
import { SUBMISSIONS_KEY } from '@/lib/submissions';

/**
 * Header notifications bell — the live notification center (features 123–126): platform BFF
 * feed with a 30s unread poll, SSE invalidation for real-time updates, and click navigation
 * into the workspace review queue when the payload carries the staff routing fields.
 * Notifications are user-scoped, but the header still renders the bell disabled in the
 * no-workspace/404 states (existing chrome behavior), so the disabled variant stays.
 */
export function NotificationsMenu({ disabled = false }: { disabled?: boolean }) {
  if (disabled) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Notifications"
        disabled
        className="text-muted-foreground"
      >
        <Bell className="size-[18px]" aria-hidden />
      </Button>
    );
  }
  return <LiveNotificationsMenu />;
}

function LiveNotificationsMenu() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const feed = useQuery(notificationFeedQueryOptions());
  const unread = useQuery(unreadCountQueryOptions());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });

  // Real-time (feature 125 pattern): every SSE event invalidates the family; poll = fallback.
  useEffect(() => {
    const subscription = subscribeToNotifications(() => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      // Also refresh the open submission detail (and list) — a notification usually reflects a
      // review-relevant change. Active-query-only, so this refetches just the mounted queries.
      void queryClient.invalidateQueries({ queryKey: SUBMISSIONS_KEY });
    });
    return () => subscription.close();
  }, [queryClient]);

  const handleItemClick = (item: NotificationItem) => {
    const full = feed.data?.items.find((i) => i.deliveryId === item.deliveryId);
    const submissionId = full?.payload?.['submissionId'];
    const workspaceSlug = full?.payload?.['workspaceSlug'];
    // Staff routing needs BOTH fields (the feature-124 contract); anything else just marks read.
    if (
      typeof submissionId === 'string' &&
      submissionId !== '' &&
      typeof workspaceSlug === 'string' &&
      workspaceSlug !== ''
    ) {
      setOpen(false);
      void navigate({
        to: '/app/$slug/submissions/$id',
        params: { slug: workspaceSlug, id: submissionId },
      });
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
        void navigate({ to: '/app/account' });
      }}
    />
  );
}
