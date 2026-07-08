import { createFileRoute } from '@tanstack/react-router';
import { TailwindReferencePage } from '@/components/dev/tailwind-reference-page';

export const Route = createFileRoute('/dev/')({
  component: TailwindReferencePage,
});
