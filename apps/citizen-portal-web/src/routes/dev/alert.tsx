import { createFileRoute } from '@tanstack/react-router';
import { AlertReferencePage } from '@/components/dev/alert-reference-page';

export const Route = createFileRoute('/dev/alert')({
  component: AlertReferencePage,
});
