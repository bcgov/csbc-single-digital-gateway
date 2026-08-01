import { createFileRoute } from '@tanstack/react-router';
import { ServiceAgreementDetailPage } from '@/components/service-agreement-detail-page';

export const Route = createFileRoute('/account_/service-agreements/$serviceAgreementId')({
  component: ServiceAgreementDetailPage,
});
