import { describe, expect, it } from 'vitest';

import { isStaffVisibleSubmission } from '../../../../src/modules/submissions/util/format';
import type { SubmissionStatus } from '../../../../src/modules/submissions/dtos/submission.dtos';

/**
 * Feature 151 — the staff detail (`get()`) gates on this predicate, and the review queue (`list()`)
 * enforces the equivalent rule in SQL (`status <> 'draft'`, initiative `staff-list-query`). A draft is
 * a citizen's un-submitted, in-progress application and must be hidden; every submitted/decided state
 * stays visible.
 */
describe('isStaffVisibleSubmission', () => {
  it('hides drafts', () => {
    expect(isStaffVisibleSubmission('draft')).toBe(false);
  });

  it('shows every submitted / decided status', () => {
    const visible: SubmissionStatus[] = [
      'pending',
      'in_review',
      'approved',
      'rejected',
      'needs_changes',
      'withdrawn',
    ];
    for (const status of visible) {
      expect(isStaffVisibleSubmission(status)).toBe(true);
    }
  });
});
