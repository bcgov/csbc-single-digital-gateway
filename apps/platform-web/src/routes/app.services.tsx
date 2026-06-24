import { createFileRoute } from '@tanstack/react-router';
import { ServicesPage } from '@/components/console/pages/services';

export const Route = createFileRoute('/app/services')({
  component: ServicesPage,
});
