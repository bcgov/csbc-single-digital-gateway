import { createFileRoute } from '@tanstack/react-router';
import { PageContentReferencePage } from '@/components/dev/page-content-reference-page';

export const Route = createFileRoute('/dev/page-content')({
  component: PageContentReferencePage,
});
