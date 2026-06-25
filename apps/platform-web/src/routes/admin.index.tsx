import { createFileRoute } from '@tanstack/react-router';
import { AdminOverview } from '@/components/admin/pages/admin-overview';

export const Route = createFileRoute('/admin/')({
  component: AdminOverview,
});
