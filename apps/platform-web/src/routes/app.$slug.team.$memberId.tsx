import { createFileRoute } from '@tanstack/react-router';
import { MemberProfilePage } from '@/components/console/pages/team-member';

export const Route = createFileRoute('/app/$slug/team/$memberId')({
  component: MemberProfilePage,
});
