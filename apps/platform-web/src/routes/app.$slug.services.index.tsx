import { createFileRoute } from '@tanstack/react-router';
import { ServicesList } from '@/components/console/services/services-list';

export const Route = createFileRoute('/app/$slug/services/')({
  component: ServicesList,
});
