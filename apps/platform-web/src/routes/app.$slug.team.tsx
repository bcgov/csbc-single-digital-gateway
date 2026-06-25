import { createFileRoute } from '@tanstack/react-router';
import { TeamPage } from '@/components/console/pages/team';

export const Route = createFileRoute('/app/$slug/team')({
  component: TeamPage,
});
