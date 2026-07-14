import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubmissionsService } from '../../../../../src/modules/submissions/services/submissions.service';
import {
  normalizeFormStructure,
  submissionReference,
} from '../../../../../src/modules/submissions/util/format';
import { submissionVersions, reviews } from '@repo/database';

vi.mock('../../../../../src/modules/submissions/util/format', () => ({
  normalizeFormStructure: vi.fn((_kind, struct) => struct),
  submissionReference: vi.fn(() => 'REF-123'),
  submissionStatusLabel: vi.fn(() => 'Pending Review'),
}));

const mockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    orderBy: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
  });
};

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let dbMock: any;
  let txMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    txMock = Object.assign(Promise.resolve([]), {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    });

    dbMock = Object.assign(Promise.resolve([]), {
      transaction: vi.fn().mockImplementation((cb) => cb(txMock)),
      select: vi.fn().mockImplementation(() => mockQuery([])),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    });

    service = new SubmissionsService(dbMock);
  });

  describe('list', () => {
    it('returns a list of submission summaries filtered by status', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]))
        // 2. subs query
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-1',
              workspaceId: 'ws-1',
              documentId: 'form-1',
              documentVersionId: 'form-v-1',
              userId: 'applicant-1',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 3. refRows select (inside toSummary)
        .mockReturnValueOnce(mockQuery([{ serviceId: 'service-1' }]))
        // 4. svc document select
        .mockReturnValueOnce(mockQuery([{ title: 'Service Title' }]))
        // 5. form document select
        .mockReturnValueOnce(mockQuery([{ title: 'Form Title' }]))
        // 6. applicant user select
        .mockReturnValueOnce(mockQuery([{ displayName: 'John Doe', email: 'john@example.com' }]))
        // 7. latest version select
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-v-1',
              status: 'pending',
              submittedAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        );

      const result = await service.list('user-1', { workspaceId: 'ws-1', status: 'pending' });

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('sub-1');
      expect(result[0]!.status).toBe('pending');
      expect(vi.mocked(submissionReference)).toHaveBeenCalled();
    });

    it('throws NotFoundException if user is not a member of the workspace', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([])); // requireMembership returns nothing

      await expect(service.list('user-1', { workspaceId: 'ws-1' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('handles anonymous submissions and fallback values when references are missing', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireMembership
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]))
        // 2. subs query
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-2',
              workspaceId: 'ws-1',
              documentId: 'form-2',
              documentVersionId: 'form-v-2',
              userId: null, // anonymous
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 3. refRows select (inside toSummary) -> serviceId is empty/null
        .mockReturnValueOnce(mockQuery([]))
        // 4. form document select -> returns empty
        .mockReturnValueOnce(mockQuery([]))
        // 5. latest version select (inside toSummary) -> no version
        .mockReturnValueOnce(mockQuery([]));

      const result = await service.list('user-1', { workspaceId: 'ws-1' });

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('sub-2');
      expect(result[0]!.applicantName).toBe('Anonymous');
      expect(result[0]!.applicantEmail).toBeNull();
      expect(result[0]!.serviceTitle).toBe('Service');
      expect(result[0]!.formTitle).toBe('Form');
      expect(result[0]!.status).toBe('draft');
      expect(result[0]!.submittedAt).toBeNull();
    });
  });

  describe('get', () => {
    it('retrieves detailed submission structure and answers', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireSubmission
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-1',
              workspaceId: 'ws-1',
              documentId: 'form-1',
              documentVersionId: 'form-v-1',
              userId: 'applicant-1',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 2. requireMembership
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]))
        // 3. refRows select (inside toSummary)
        .mockReturnValueOnce(mockQuery([{ serviceId: 'service-1' }]))
        // 4. svc document select
        .mockReturnValueOnce(mockQuery([{ title: 'Service Title' }]))
        // 5. form document select
        .mockReturnValueOnce(mockQuery([{ title: 'Form Title' }]))
        // 6. applicant user select
        .mockReturnValueOnce(mockQuery([{ displayName: 'John Doe', email: 'john@example.com' }]))
        // 7. latest version select (inside toSummary)
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-v-1',
              status: 'pending',
              submittedAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 8. latest answers select (inside get)
        .mockReturnValueOnce(mockQuery([{ data: { name: 'Lewis' } }]))
        // 9. form definition select
        .mockReturnValueOnce(mockQuery([{ kind: 'basic-form', structure: { type: 'object' } }]))
        // 10. reviewsFor select
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'rev-1',
              decision: 'approved',
              reason: 'looks good',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              reviewerName: 'Staff Member',
            },
          ]),
        );

      const result = await service.get('user-1', 'sub-1');

      expect(result.id).toBe('sub-1');
      expect(result.kind).toBe('basic-form');
      expect(result.data).toEqual({ name: 'Lewis' });
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0]!.reviewerName).toBe('Staff Member');
      expect(vi.mocked(normalizeFormStructure)).toHaveBeenCalled();
    });

    it('throws NotFoundException if toSummary returns null', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireSubmission
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-1',
              workspaceId: 'ws-1',
              documentId: 'form-1',
              documentVersionId: 'form-v-1',
            },
          ]),
        )
        // 2. requireMembership
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]));

      vi.spyOn(service as any, 'toSummary').mockResolvedValueOnce(null);

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if the submission cannot be found', async () => {
      dbMock.select = vi.fn().mockReturnValueOnce(mockQuery([]));

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('handles undefined form and version with fallbacks in get', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireSubmission
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-1',
              workspaceId: 'ws-1',
              documentId: 'form-1',
              documentVersionId: 'form-v-1',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 2. requireMembership
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]))
        // 3. refRows select (inside toSummary)
        .mockReturnValueOnce(mockQuery([{ serviceId: 'service-1' }]))
        // 4. svc document select
        .mockReturnValueOnce(mockQuery([{ title: 'Service Title' }]))
        // 5. form document select
        .mockReturnValueOnce(mockQuery([{ title: 'Form Title' }]))
        // 6. applicant user select
        .mockReturnValueOnce(mockQuery([{ displayName: 'John Doe', email: 'john@example.com' }]))
        // 7. latest version select (inside toSummary)
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-v-1',
              status: 'pending',
              submittedAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 8. latest answers select (inside get) -> returns empty (undefined version)
        .mockReturnValueOnce(mockQuery([]))
        // 9. form definition select -> returns empty (undefined form)
        .mockReturnValueOnce(mockQuery([]))
        // 10. reviewsFor select
        .mockReturnValueOnce(mockQuery([]));

      const result = await service.get('user-1', 'sub-1');

      expect(result.kind).toBe('basic-form');
      expect(result.structure).toEqual({});
      expect(result.data).toEqual({});
    });
  });

  describe('review', () => {
    it('inserts a review row and updates submission status in a transaction', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireSubmission
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-1',
              workspaceId: 'ws-1',
              documentId: 'form-1',
              documentVersionId: 'form-v-1',
              userId: 'applicant-1',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 2. requireMembership
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]))
        // 3. latestVersion
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-v-1',
              status: 'pending',
              version: 1,
            },
          ]),
        )
        // --- Transaction commits review updates, then calls this.get ---
        // 4. requireSubmission (get)
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-1',
              workspaceId: 'ws-1',
              documentId: 'form-1',
              documentVersionId: 'form-v-1',
              userId: 'applicant-1',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 5. requireMembership (get)
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]))
        // 6. refRows select (inside toSummary)
        .mockReturnValueOnce(mockQuery([{ serviceId: 'service-1' }]))
        // 7. svc document select
        .mockReturnValueOnce(mockQuery([{ title: 'Service Title' }]))
        // 8. form document select
        .mockReturnValueOnce(mockQuery([{ title: 'Form Title' }]))
        // 9. applicant user select
        .mockReturnValueOnce(mockQuery([{ displayName: 'John Doe', email: 'john@example.com' }]))
        // 10. latest version select (inside toSummary)
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-v-1',
              status: 'approved', // updated
              submittedAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 11. latest answers select (inside get)
        .mockReturnValueOnce(mockQuery([{ data: { name: 'Lewis' } }]))
        // 12. form definition select
        .mockReturnValueOnce(mockQuery([{ kind: 'basic-form', structure: { type: 'object' } }]))
        // 13. reviewsFor select
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'rev-1',
              decision: 'approved',
              reason: 'looks good',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              reviewerName: 'Staff Member',
            },
          ]),
        );

      const result = await service.review('user-1', 'sub-1', {
        decision: 'approve',
        reason: 'looks good',
      });

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(txMock.insert).toHaveBeenCalledWith(reviews);
      expect(txMock.update).toHaveBeenCalledWith(submissionVersions);
      expect(result.status).toBe('approved');
    });

    it('throws ConflictException if the submission is not in pending/in_review status', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireSubmission
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-1',
              workspaceId: 'ws-1',
              documentId: 'form-1',
              documentVersionId: 'form-v-1',
              userId: 'applicant-1',
            },
          ]),
        )
        // 2. requireMembership
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]))
        // 3. latestVersion
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-v-1',
              status: 'approved', // not reviewable
              version: 1,
            },
          ]),
        );

      await expect(service.review('user-1', 'sub-1', { decision: 'approve' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException if latestVersion returns null', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireSubmission
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-1',
              workspaceId: 'ws-1',
              documentId: 'form-1',
              documentVersionId: 'form-v-1',
            },
          ]),
        )
        // 2. requireMembership
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]))
        // 3. latestVersion (queries submissionVersions)
        .mockReturnValueOnce(mockQuery([]));

      await expect(service.review('user-1', 'sub-1', { decision: 'approve' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('inserts a review row with null reason if reason is omitted', async () => {
      dbMock.select = vi
        .fn()
        // 1. requireSubmission
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-1',
              workspaceId: 'ws-1',
              documentId: 'form-1',
              documentVersionId: 'form-v-1',
              userId: 'applicant-1',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        // 2. requireMembership
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]))
        // 3. latestVersion
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-v-1',
              status: 'pending',
              version: 1,
            },
          ]),
        )
        // --- toSummary calls inside get ---
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-1',
              workspaceId: 'ws-1',
              documentId: 'form-1',
              documentVersionId: 'form-v-1',
              userId: 'applicant-1',
              createdAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([{ userId: 'user-1' }]))
        .mockReturnValueOnce(mockQuery([{ serviceId: 'service-1' }]))
        .mockReturnValueOnce(mockQuery([{ title: 'Service Title' }]))
        .mockReturnValueOnce(mockQuery([{ title: 'Form Title' }]))
        .mockReturnValueOnce(mockQuery([{ displayName: 'John Doe', email: 'john@example.com' }]))
        .mockReturnValueOnce(
          mockQuery([
            {
              id: 'sub-v-1',
              status: 'approved',
              submittedAt: new Date('2026-07-12T00:00:00.000Z'),
              updatedAt: new Date('2026-07-12T00:00:00.000Z'),
            },
          ]),
        )
        .mockReturnValueOnce(mockQuery([{ data: { name: 'Lewis' } }]))
        .mockReturnValueOnce(mockQuery([{ kind: 'basic-form', structure: { type: 'object' } }]))
        .mockReturnValueOnce(mockQuery([]));

      await service.review('user-1', 'sub-1', {
        decision: 'approve',
      });

      expect(txMock.insert).toHaveBeenCalledWith(reviews);
      expect(txMock.values).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: null,
        }),
      );
    });
  });
});
