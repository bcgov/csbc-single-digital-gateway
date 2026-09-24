import { createFileRoute } from '@tanstack/react-router';
import { AdminTemplatesList } from '@/components/admin/templates/admin-templates-list';

export const Route = createFileRoute('/admin/templates/')({
  component: AdminTemplatesList,
});
