import { createFileRoute } from '@tanstack/react-router';
import { ConsoleAgreementDetail } from '@/components/console/service-agreements/console-agreements-pages';

export const Route = createFileRoute('/app/$slug/service-agreements/$id')({
  component: ConsoleAgreementDetail,
});
