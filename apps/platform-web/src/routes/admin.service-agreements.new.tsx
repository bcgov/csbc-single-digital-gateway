import { createFileRoute } from '@tanstack/react-router';
import { AdminAgreementsNew } from '@/components/console/service-agreements/admin-agreements-pages';

export const Route = createFileRoute('/admin/service-agreements/new')({
  component: AdminAgreementsNew,
});
