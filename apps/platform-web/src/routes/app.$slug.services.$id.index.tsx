import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetail } from '@/components/console/services/service-detail';

export const Route = createFileRoute('/app/$slug/services/$id/')({
  component: ServiceDetail,
});
