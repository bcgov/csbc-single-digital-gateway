import { createFileRoute } from '@tanstack/react-router';
import { ServicesPage } from '@/components/services-page';

export const Route = createFileRoute('/services')({
  component: ServicesPage,
});
