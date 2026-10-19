import { createFileRoute } from '@tanstack/react-router';
import { PageLayoutsReferencePage } from '@/components/dev/page-layouts-reference-page';

export const Route = createFileRoute('/dev/page-layouts')({
  component: PageLayoutsReferencePage,
});
