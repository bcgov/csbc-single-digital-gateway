import { createFileRoute } from '@tanstack/react-router';
import { ServiceAgreementsPage } from '@/components/service-agreements-page';

export const Route = createFileRoute('/account_/service-agreements/')({
  component: ServiceAgreementsPage,
});
