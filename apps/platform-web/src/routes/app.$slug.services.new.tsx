import { createFileRoute } from '@tanstack/react-router';
import { ServiceCreate } from '@/components/console/services/service-create';

export const Route = createFileRoute('/app/$slug/services/new')({
  component: ServiceCreate,
});
