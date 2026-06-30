import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetailPage } from '@/components/service-detail-page';

export const Route = createFileRoute('/services/$serviceId/')({
  component: ServiceDetailPage,
});
