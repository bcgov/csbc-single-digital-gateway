import { createFileRoute } from '@tanstack/react-router';
import { TeamPage } from '@/components/console/pages/team';
import { listSearchValidator } from '@/lib/list-search';
import type { MemberSort } from '@/lib/workspaces';

const MEMBER_SORTS = ['name', 'role', 'joined'] as const satisfies readonly MemberSort[];

export const Route = createFileRoute('/app/$slug/team/')({
  validateSearch: listSearchValidator(MEMBER_SORTS, { sort: 'role', order: 'asc' }),
  component: TeamPage,
});
