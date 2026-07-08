import { createFileRoute } from '@tanstack/react-router';
import { BadgeReferencePage } from '@/components/dev/badge-reference-page';

export const Route = createFileRoute('/dev/badge')({
  component: BadgeReferencePage,
});
