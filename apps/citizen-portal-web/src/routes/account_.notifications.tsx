import { createFileRoute } from '@tanstack/react-router';
import { NotificationPreferencesPage } from '@/components/notification-preferences-page';

export const Route = createFileRoute('/account_/notifications')({
  component: NotificationPreferencesPage,
});
