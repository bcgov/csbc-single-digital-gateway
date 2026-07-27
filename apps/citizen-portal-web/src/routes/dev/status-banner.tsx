import { createFileRoute } from '@tanstack/react-router';
import { StatusBannerReferencePage } from '@/components/dev/status-banner-reference-page';

export const Route = createFileRoute('/dev/status-banner')({
  component: StatusBannerReferencePage,
});
