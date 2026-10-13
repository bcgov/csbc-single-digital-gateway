import { createFileRoute } from '@tanstack/react-router';
import { ApplyPage } from '@/components/apply-page';

/** Doc 291: fill one of a service's published application methods — public, nothing is submitted yet. */
export const Route = createFileRoute('/services/$serviceId/apply/$methodId')({
  component: ApplyPage,
});
