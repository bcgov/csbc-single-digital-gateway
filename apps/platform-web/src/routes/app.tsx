import { createFileRoute } from '@tanstack/react-router';
import { AppPage } from '@/components/app-page';

export const Route = createFileRoute('/app')({
  component: AppPage,
});
