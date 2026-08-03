import { describe, expect, it } from 'vitest';
import {
  submissionStatusSchema,
  listSubmissionsQuerySchema,
  reviewSubmissionSchema,
  submissionSummarySchema,
  submissionDetailSchema,
  reviewEntrySchema,
} from '../../../../../src/modules/submissions/dtos/submission.dtos';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('Submission DTO schemas', () => {
  const VALID_UUID = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';

  describe('submissionStatusSchema', () => {
    it('accepts valid submission status values', () => {
      const validStatuses = [
        'draft',
        'pending',
        'in_review',
        'approved',
        'rejected',
        'needs_changes',
        'withdrawn',
      ];
      for (const status of validStatuses) {
        expect(submissionStatusSchema.safeParse(status).success).toBe(true);
      }
    });

    it('rejects invalid status values', () => {
      expect(submissionStatusSchema.safeParse('invalid_status').success).toBe(false);
    });
  });

  describe('listSubmissionsQuerySchema', () => {
    it('accepts valid queries with a workspace UUID', () => {
      expect(listSubmissionsQuerySchema.safeParse({ workspaceId: VALID_UUID }).success).toBe(true);
      expect(
        listSubmissionsQuerySchema.safeParse({ workspaceId: VALID_UUID, status: 'pending' })
          .success,
      ).toBe(true);
    });

    it('rejects missing or invalid workspace UUIDs', () => {
      expect(listSubmissionsQuerySchema.safeParse({}).success).toBe(false);
      expect(listSubmissionsQuerySchema.safeParse({ workspaceId: 'not-a-uuid' }).success).toBe(
        false,
      );
    });

    it('rejects invalid statuses in query', () => {
      expect(
        listSubmissionsQuerySchema.safeParse({ workspaceId: VALID_UUID, status: 'invalid' })
          .success,
      ).toBe(false);
    });
  });

  describe('reviewSubmissionSchema', () => {
    it('accepts valid decisions with optional reason', () => {
      expect(reviewSubmissionSchema.safeParse({ decision: 'approve' }).success).toBe(true);
      expect(
        reviewSubmissionSchema.safeParse({ decision: 'reject', reason: 'Not sufficient' }).success,
      ).toBe(true);
      expect(
        reviewSubmissionSchema.safeParse({
          decision: 'request_changes',
          reason: 'Need more fields',
        }).success,
      ).toBe(true);
    });

    it('rejects invalid decision value', () => {
      expect(reviewSubmissionSchema.safeParse({ decision: 'other' }).success).toBe(false);
    });

    it('rejects reasons longer than 2000 characters', () => {
      const longReason = 'a'.repeat(2001);
      expect(
        reviewSubmissionSchema.safeParse({ decision: 'reject', reason: longReason }).success,
      ).toBe(false);
    });
  });

  describe('submissionSummarySchema', () => {
    const validSummary = {
      id: 'sub-1',
      serviceId: 'service-1',
      serviceTitle: 'My Service',
      formId: 'form-1',
      formTitle: 'My Form',
      applicantName: 'Applicant name',
      applicantEmail: 'app@example.com',
      status: 'pending',
      statusLabel: 'Pending Review',
      reference: 'REF-001',
      submittedAt: '2026-07-12T12:00:00Z',
      updatedAt: '2026-07-12T12:30:00Z',
    };

    it('accepts valid submission summaries', () => {
      expect(submissionSummarySchema.safeParse(validSummary).success).toBe(true);
    });

    it('accepts null applicant email and submittedAt values', () => {
      const nullsSummary = {
        ...validSummary,
        applicantEmail: null,
        submittedAt: null,
      };
      expect(submissionSummarySchema.safeParse(nullsSummary).success).toBe(true);
    });

    it('rejects missing required properties', () => {
      const missingKey = { ...validSummary };
      delete (missingKey as any).id;
      expect(submissionSummarySchema.safeParse(missingKey).success).toBe(false);
    });
  });

  describe('reviewEntrySchema', () => {
    const validEntry = {
      id: 'review-1',
      decision: 'approve',
      reason: 'Valid content',
      reviewerName: 'Staff Member',
      createdAt: '2026-07-12T12:30:00Z',
    };

    it('accepts valid review entries', () => {
      expect(reviewEntrySchema.safeParse(validEntry).success).toBe(true);
    });

    it('accepts null reason', () => {
      expect(reviewEntrySchema.safeParse({ ...validEntry, reason: null }).success).toBe(true);
    });
  });

  describe('submissionDetailSchema', () => {
    const validDetail = {
      id: 'sub-1',
      serviceId: 'service-1',
      serviceTitle: 'My Service',
      formId: 'form-1',
      formTitle: 'My Form',
      applicantName: 'Applicant name',
      applicantEmail: 'app@example.com',
      status: 'pending',
      statusLabel: 'Pending Review',
      reference: 'REF-001',
      submittedAt: '2026-07-12T12:00:00Z',
      updatedAt: '2026-07-12T12:30:00Z',
      kind: 'basic-form',
      structure: { type: 'object' },
      data: { name: 'Lewis' },
      reviews: [
        {
          id: 'review-1',
          decision: 'approve',
          reason: 'Valid content',
          reviewerName: 'Staff Member',
          createdAt: '2026-07-12T12:30:00Z',
        },
      ],
    };

    it('accepts valid submission details', () => {
      expect(submissionDetailSchema.safeParse(validDetail).success).toBe(true);
    });

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
      expect(
        listSubmissionsQuerySchema.safeParse({ workspaceId: UUID, sort: 'bogus' }).success,
      ).toBe(false);
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
});
