import { createFileRoute } from '@tanstack/react-router';
import { SubmissionsPage } from '@/components/console/pages/submissions';
import { listSearchValidator } from '@/lib/list-search';
import type { SubmissionSort } from '@/lib/submissions';

const SUBMISSION_SORTS = [
  'submitted',
  'updated',
  'status',
] as const satisfies readonly SubmissionSort[];
const STATUS_VALUES = ['pending', 'in_review', 'needs_changes', 'approved'] as const;
const validateList = listSearchValidator(SUBMISSION_SORTS, { sort: 'submitted', order: 'desc' });

export const Route = createFileRoute('/app/$slug/submissions/')({
  // The list controls (page/sort/order/q) + the status tab are all kept in the URL.
  validateSearch: (search: Record<string, unknown>) => {
    const status = STATUS_VALUES.find((value) => value === search.status);
    return { ...validateList(search), ...(status ? { status } : {}) };
  },
  component: SubmissionsPage,
});
