import { createFileRoute } from '@tanstack/react-router';
import { ServicesList } from '@/components/console/services/services-list';
import { listSearchValidator } from '@/lib/list-search';
import type { ServiceSort } from '@/lib/services';

const SERVICE_SORTS = ['title', 'updated', 'status'] as const satisfies readonly ServiceSort[];

export const Route = createFileRoute('/app/$slug/services/')({
  validateSearch: listSearchValidator(SERVICE_SORTS, { sort: 'updated', order: 'desc' }),
  component: ServicesList,
});
