import { createFileRoute } from '@tanstack/react-router';
import { AdminAgreementsList } from '@/components/console/service-agreements/admin-agreements-pages';

export const Route = createFileRoute('/admin/service-agreements/')({
  component: AdminAgreementsList,
});
