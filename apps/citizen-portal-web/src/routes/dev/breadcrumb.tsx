import { createFileRoute } from '@tanstack/react-router';
import { BreadcrumbReferencePage } from '@/components/dev/breadcrumb-reference-page';

export const Route = createFileRoute('/dev/breadcrumb')({
  component: BreadcrumbReferencePage,
});
