import { createFileRoute } from '@tanstack/react-router';
import { ReportsPage } from '@/components/console/pages/reports';

export const Route = createFileRoute('/app/reports')({
  component: ReportsPage,
});
