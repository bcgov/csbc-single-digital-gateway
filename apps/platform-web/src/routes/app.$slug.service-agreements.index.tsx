import { createFileRoute } from '@tanstack/react-router';
import { ConsoleAgreementsList } from '@/components/console/service-agreements/console-agreements-pages';

export const Route = createFileRoute('/app/$slug/service-agreements/')({
  component: ConsoleAgreementsList,
});
