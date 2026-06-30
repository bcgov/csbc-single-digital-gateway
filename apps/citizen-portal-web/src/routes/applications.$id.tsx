import { createFileRoute } from '@tanstack/react-router';
import { ApplicationDetailPage } from '@/components/application-detail-page';

export const Route = createFileRoute('/applications/$id')({
  component: ApplicationDetailPage,
});
