import { createFileRoute } from '@tanstack/react-router';
import { AdminAgreementsList } from '@/components/console/service-agreements/admin-agreements-pages';
import { listSearchValidator } from '@/lib/list-search';
import type { AgreementSort } from '@/lib/service-agreements';

const AGREEMENT_SORTS = ['title', 'updated', 'status'] as const satisfies readonly AgreementSort[];

export const Route = createFileRoute('/admin/service-agreements/')({
  validateSearch: listSearchValidator(AGREEMENT_SORTS, { sort: 'updated', order: 'desc' }),
  component: AdminAgreementsList,
});
