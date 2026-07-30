import { describe, expect, it } from 'vitest';
import {
  listSubmissionsQuerySchema,
  reviewSubmissionSchema,
} from '../src/modules/submissions/dtos/submission.dtos';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('submission DTO schemas', () => {
  it('list: requires a uuid workspaceId, defaults paging/sort, coerces limit/offset', () => {
    expect(listSubmissionsQuerySchema.safeParse({}).success).toBe(false);
    const parsed = listSubmissionsQuerySchema.safeParse({ workspaceId: UUID });
    expect(parsed.success && parsed.data).toMatchObject({
      sort: 'submitted',
      order: 'desc',
      limit: 20,
      offset: 0,
    });
    const coerced = listSubmissionsQuerySchema.safeParse({
      workspaceId: UUID,
      limit: '50',
      offset: '20',
    });
    expect(coerced.success && coerced.data.limit).toBe(50);
    expect(coerced.success && coerced.data.offset).toBe(20);
  });

  it('list: accepts a status filter + q, bounds limit, rejects unknown sort/order/status', () => {
    expect(
      listSubmissionsQuerySchema.safeParse({ workspaceId: UUID, status: 'approved', q: 'abc' })
        .success,
    ).toBe(true);
    expect(listSubmissionsQuerySchema.safeParse({ workspaceId: UUID, limit: 0 }).success).toBe(
      false,
    );
    expect(listSubmissionsQuerySchema.safeParse({ workspaceId: UUID, limit: 101 }).success).toBe(
      false,
    );
    expect(listSubmissionsQuerySchema.safeParse({ workspaceId: UUID, sort: 'bogus' }).success).toBe(
      false,
    );
    expect(listSubmissionsQuerySchema.safeParse({ workspaceId: UUID, order: 'up' }).success).toBe(
      false,
    );
    expect(
      listSubmissionsQuerySchema.safeParse({ workspaceId: UUID, status: 'nope' }).success,
    ).toBe(false);
  });

  it('review: requires a known decision; reason optional (length-capped)', () => {
    expect(reviewSubmissionSchema.safeParse({ decision: 'approve' }).success).toBe(true);
    expect(reviewSubmissionSchema.safeParse({ decision: 'maybe' }).success).toBe(false);
    expect(
      reviewSubmissionSchema.safeParse({ decision: 'reject', reason: 'a'.repeat(2001) }).success,
    ).toBe(false);
  });
});
