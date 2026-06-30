import { createFileRoute } from '@tanstack/react-router';
import { ApplicationPage } from '@/components/application-page';

export const Route = createFileRoute('/services/$serviceId/apply/$formId')({
  component: ApplicationPage,
});
