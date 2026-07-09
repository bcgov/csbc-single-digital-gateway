import { createFileRoute } from '@tanstack/react-router';
import { ConsoleAgreementsNew } from '@/components/console/service-agreements/console-agreements-pages';

export const Route = createFileRoute('/app/$slug/service-agreements/new')({
  component: ConsoleAgreementsNew,
});
