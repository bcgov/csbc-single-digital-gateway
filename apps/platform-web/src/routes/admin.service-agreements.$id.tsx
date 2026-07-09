import { createFileRoute } from '@tanstack/react-router';
import { AdminAgreementDetail } from '@/components/console/service-agreements/admin-agreements-pages';

export const Route = createFileRoute('/admin/service-agreements/$id')({
  component: AdminAgreementDetail,
});
