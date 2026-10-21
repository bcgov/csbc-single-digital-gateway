import { createFileRoute } from '@tanstack/react-router';
import { AdminTemplateDetail } from '@/components/admin/templates/admin-template-detail';

export const Route = createFileRoute('/admin/templates/$id')({
  component: AdminTemplateDetail,
});
