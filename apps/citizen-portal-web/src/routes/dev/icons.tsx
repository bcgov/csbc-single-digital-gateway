import { createFileRoute } from '@tanstack/react-router';
import { IconReferencePage } from '@/components/dev/icon-reference-page';

export const Route = createFileRoute('/dev/icons')({
  component: IconReferencePage,
});
