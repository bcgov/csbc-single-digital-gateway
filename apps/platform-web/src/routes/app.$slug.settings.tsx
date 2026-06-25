import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/components/console/pages/settings';

export const Route = createFileRoute('/app/$slug/settings')({
  component: SettingsPage,
});
