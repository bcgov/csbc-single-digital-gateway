import { createFileRoute } from '@tanstack/react-router';
import { NotificationSettingsPage } from '@/components/console/pages/notification-settings';

export const Route = createFileRoute('/app/notification-settings')({
  component: NotificationSettingsPage,
});
