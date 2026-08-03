import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubmissionsService } from '../../../../../src/modules/submissions/services/submissions.service';
import {
  documents,
  documentReferences,
  documentVersions,
  reviews,
  submissionVersions,
  submissions,
  users,
  workspaceMembers,
} from '@repo/database';
import { enqueueNotification } from '../../../../../src/notifications/enqueue';

vi.mock('../../../../../src/notifications/enqueue', () => ({
  enqueueNotification: vi.fn(),
}));

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let dbMock: any;
  let txMock: any;
  let configMock: any;
  let tableResponses: Map<any, any[]>;

  const addMockResponse = (table: any, value: any) => {
    if (!tableResponses.has(table)) {
      tableResponses.set(table, []);
    }
    tableResponses.get(table)!.push(value);
  };

  const createSelectBuilder = (selector?: any) => {
    let resolvedValue: any = [];
    /* eslint-disable unicorn/no-thenable */
    const qb: any = {
      then: (onfulfilled: any) => Promise.resolve(resolvedValue).then(onfulfilled),
    };
    /* eslint-enable unicorn/no-thenable */
    qb.from = vi.fn().mockImplementation((table) => {
      const list = tableResponses.get(table) || [];
      let val = list.shift() ?? [];
      if (selector && table === submissions && Array.isArray(val)) {
        const isCount = selector.count !== undefined;
        if (!isCount) {
          val = val.map((item: any) => ({
            sub: item,
            status: item.status ?? 'pending',
            submittedAt: item.submittedAt === undefined ? item.createdAt : item.submittedAt,
            versionUpdatedAt: item.updatedAt,
            serviceId: item.serviceId,
            serviceTitle: item.serviceTitle,
            formTitle: item.formTitle,
            applicantName: item.applicantName,
            applicantEmail: item.applicantEmail,
          }));
        }
      }
      resolvedValue = val;
      return qb;
    });
    qb.innerJoin = vi.fn().mockReturnValue(qb);
    qb.leftJoin = vi.fn().mockReturnValue(qb);
    qb.where = vi.fn().mockReturnValue(qb);
    qb.orderBy = vi.fn().mockReturnValue(qb);
    qb.limit = vi.fn().mockReturnValue(qb);
    qb.offset = vi.fn().mockReturnValue(qb);
    return qb;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tableResponses = new Map();

    txMock = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    dbMock = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(txMock)),
      select: vi.fn().mockImplementation((selector?: any) => createSelectBuilder(selector)),
    };

    configMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'CITIZEN_WEB_URL') {
          return 'http://citizen.example.com';
        }
        return undefined;
      }),
    };

    service = new SubmissionsService(dbMock, configMock);
  });

  describe('list', () => {
    it('throws NotFoundException if the user is not a member of the workspace', async () => {
      // requireMembership returns empty
      addMockResponse(workspaceMembers, []);

      await expect(service.list('user-1', { workspaceId: 'ws-1' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns a list of submissions for a member', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'applicant-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
        serviceId: 'doc-svc-1',
        serviceTitle: 'My Service',
        formTitle: 'My Form',
        applicantName: 'Jane Doe',
        applicantEmail: 'jane@example.com',
        status: 'pending',
        submittedAt: new Date('2026-07-28T00:00:00Z'),
      };

      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(submissions, [mockSub]);
      addMockResponse(submissions, [{ count: 1 }]);

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);

      expect(result.items).toEqual([
        {
          id: 'sub-1',
          serviceId: 'doc-svc-1',
          serviceTitle: 'My Service',
          formId: 'doc-form-1',
          formTitle: 'My Form',
          applicantName: 'Jane Doe',
          applicantEmail: 'jane@example.com',
          status: 'pending',
          statusLabel: 'Pending',
          reference: '20260728-SUB1',
          submittedAt: '2026-07-28T00:00:00.000Z',
          updatedAt: '2026-07-28T00:00:00.000Z',
        },
      ]);
      expect(result.total).toBe(1);
    });

    it('filters list of submissions by status if specified', async () => {
      const mockSub1 = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'applicant-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
        serviceId: 'doc-svc-1',
        serviceTitle: 'My Service',
        formTitle: 'My Form',
        applicantName: 'Jane Doe',
        applicantEmail: 'jane@example.com',
        status: 'pending',
        submittedAt: new Date('2026-07-28T00:00:00Z'),
      };
      const mockSub2 = {
        id: 'sub-2',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'applicant-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
        serviceId: 'doc-svc-1',
        serviceTitle: 'My Service',
        formTitle: 'My Form',
        applicantName: 'Jane Doe',
        applicantEmail: 'jane@example.com',
        status: 'approved',
        submittedAt: new Date('2026-07-28T00:00:00Z'),
      };

      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(submissions, [mockSub1, mockSub2]);
      addMockResponse(submissions, [{ count: 2 }]);

      // query status 'pending'
      const result = await service.list('user-1', {
        workspaceId: 'ws-1',
        status: 'pending',
      } as any);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.id).toBe('sub-1');
    });
  });

  describe('get', () => {
    it('throws NotFoundException if the submission does not exist', async () => {
      addMockResponse(submissions, []);

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if the user is not a member of the workspace', async () => {
      const mockSub = { id: 'sub-1', workspaceId: 'ws-1' };
      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, []);

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if toSummary returns null', async () => {
      const mockSub = { id: 'sub-1', workspaceId: 'ws-1' };
      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      vi.spyOn(service as any, 'toSummary').mockResolvedValueOnce(null);

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('successfully retrieves a submission and details', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'applicant-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(documentReferences, [{ serviceId: 'doc-svc-1' }]);
      addMockResponse(documents, [{ title: 'My Service' }]); // toSummary (service)
      addMockResponse(documents, [{ title: 'My Form' }]); // toSummary (form)
      addMockResponse(users, [{ displayName: 'Jane Doe', email: 'jane@example.com' }]); // toSummary (user)
      addMockResponse(submissionVersions, [
        {
          status: 'pending',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]); // toSummary (latestVersion)
      addMockResponse(submissionVersions, [{ data: { name: 'Jane' } }]); // get (latestVersion data)
      addMockResponse(documentVersions, [
        {
          kind: 'basic-form',
          schema: { type: 'object' },
        },
      ]); // get (documentVersions schema/kind)
      addMockResponse(reviews, [
        {
          id: 'review-1',
          decision: 'approved',
          reason: 'Good',
          createdAt: new Date('2026-07-28T01:00:00Z'),
          reviewerName: 'Staff Member',
        },
      ]); // get (reviews)

      const result = await service.get('user-1', 'sub-1');

      expect(result).toEqual({
        id: 'sub-1',
        serviceId: 'doc-svc-1',
        serviceTitle: 'My Service',
        formId: 'doc-form-1',
        formTitle: 'My Form',
        applicantName: 'Jane Doe',
        applicantEmail: 'jane@example.com',
        status: 'pending',
        statusLabel: 'Pending',
        reference: '20260728-SUB1',
        submittedAt: '2026-07-28T00:00:00.000Z',
        updatedAt: '2026-07-28T00:00:00.000Z',
        kind: 'basic-form',
        structure: {
          schema: { type: 'object', properties: {} },
          uischema: {
            type: 'VerticalLayout',
            elements: [],
          },
        },
        data: { name: 'Jane' },
        reviews: [
          {
            id: 'review-1',
            decision: 'approved',
            reason: 'Good',
            reviewerName: 'Staff Member',
            createdAt: '2026-07-28T01:00:00.000Z',
          },
        ],
      });
    });
  });

  describe('review', () => {
    it('throws ConflictException if submission is not in a reviewable status', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        userId: 'applicant-1',
      };
      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(submissionVersions, [{ id: 'ver-1', status: 'approved' }]);

      await expect(
        service.review('user-1', 'sub-1', {
          decision: 'approve',
          reason: 'Looks good',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if latest version is not found', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        userId: 'applicant-1',
      };
      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      vi.spyOn(service as any, 'latestVersion').mockResolvedValueOnce(null);

      await expect(
        service.review('user-1', 'sub-1', {
          decision: 'approve',
          reason: 'Looks good',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('successfully processes review for an anonymous submission (userId is null)', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        userId: null,
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(submissionVersions, [{ id: 'ver-1', status: 'pending' }]);

      // txMock return insert review
      txMock.returning.mockResolvedValueOnce([{ id: 'review-1' }]);

      // get() mocks:
      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(documentReferences, [{ serviceId: 'doc-svc-1' }]);
      addMockResponse(documents, [{ title: 'My Service' }]);
      addMockResponse(documents, [{ title: 'My Form' }]);
      addMockResponse(users, []); // anonymous applicant
      addMockResponse(submissionVersions, [
        {
          status: 'approved',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]);
      addMockResponse(submissionVersions, [{ data: {} }]);
      addMockResponse(documentVersions, [{ kind: 'basic-form', schema: {} }]);
      addMockResponse(reviews, [
        {
          id: 'review-1',
          decision: 'approved',
          reason: 'Looks good',
          createdAt: new Date('2026-07-28T01:00:00Z'),
          reviewerName: 'Staff Member',
        },
      ]);

      const result = await service.review('user-1', 'sub-1', {
        decision: 'approve',
        reason: 'Looks good',
      });

      expect(txMock.insert).toHaveBeenCalledWith(reviews);
      expect(txMock.update).toHaveBeenCalledWith(submissionVersions);
      expect(enqueueNotification).not.toHaveBeenCalled();
      expect(result.applicantName).toBe('Anonymous');
    });

    it('successfully processes review and enqueues notification for a registered user', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        userId: 'applicant-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(submissionVersions, [{ id: 'ver-1', status: 'pending' }]);
      addMockResponse(users, [{ email: 'jane@example.com' }]); // resolve owner's contact email

      // txMock return insert review
      txMock.returning.mockResolvedValueOnce([{ id: 'review-1' }]);

      // get() mocks:
      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(documentReferences, [{ serviceId: 'doc-svc-1' }]);
      addMockResponse(documents, [{ title: 'My Service' }]);
      addMockResponse(documents, [{ title: 'My Form' }]);
      addMockResponse(users, [{ displayName: 'Jane Doe', email: 'jane@example.com' }]);
      addMockResponse(submissionVersions, [
        {
          status: 'approved',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]);
      addMockResponse(submissionVersions, [{ data: {} }]);
      addMockResponse(documentVersions, [{ kind: 'basic-form', schema: {} }]);
      addMockResponse(reviews, []);

      await service.review('user-1', 'sub-1', {
        decision: 'approve',
        reason: 'Looks good',
      });

      expect(txMock.insert).toHaveBeenCalledWith(reviews);
      expect(txMock.update).toHaveBeenCalledWith(submissionVersions);
      expect(enqueueNotification).toHaveBeenCalledWith(txMock, {
        idempotencyKey: 'review:review-1',
        userId: 'applicant-1',
        type: 'application.approved',
        title: 'Your application was approved',
        body: 'A decision was recorded on application 20260728-SUB1. Reviewer note: Looks good',
        payload: {
          submissionId: 'sub-1',
          link: 'http://citizen.example.com/applications/sub-1',
          linkLabel: 'View application',
        },
        email: 'jane@example.com',
      });
    });
  });

  describe('toSummary fallbacks', () => {
    it('uses fallback values when metadata/version/service/form/applicant are missing or null', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: null,
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T01:00:00Z'),
        status: 'draft',
        submittedAt: null,
      };

      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(submissions, [mockSub]);
      addMockResponse(submissions, [{ count: 1 }]);

      const result = await service.list('user-1', { workspaceId: 'ws-1' } as any);

      expect(result.items).toEqual([
        {
          id: 'sub-1',
          serviceId: '',
          serviceTitle: 'Service',
          formId: 'doc-form-1',
          formTitle: 'Form',
          applicantName: 'Anonymous',
          applicantEmail: null,
          status: 'draft',
          statusLabel: 'Draft',
          reference: '20260728-SUB1',
          submittedAt: null,
          updatedAt: '2026-07-28T01:00:00.000Z',
        },
      ]);
    });

    it('uses fallback values for detail when form or version is missing', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(documentReferences, []);
      addMockResponse(documents, []);
      addMockResponse(documents, []);
      addMockResponse(users, []);
      addMockResponse(submissionVersions, [
        {
          status: 'pending',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]);
      addMockResponse(submissionVersions, []);
      addMockResponse(documentVersions, []);
      addMockResponse(reviews, []);

      const result = await service.get('user-1', 'sub-1');
      expect(result.kind).toBe('basic-form');
      expect(result.data).toEqual({});
      expect(result.structure).toEqual({
        schema: { type: 'object', properties: {} },
        uischema: { type: 'VerticalLayout', elements: [] },
      });
    });

    it('handles review notification when owner has no email', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'applicant-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(submissionVersions, [{ id: 'ver-1', status: 'pending' }]);
      addMockResponse(users, []);

      txMock.returning.mockResolvedValueOnce([{ id: 'review-1' }]);

      addMockResponse(submissions, [mockSub]);
      addMockResponse(workspaceMembers, [{ userId: 'user-1' }]);
      addMockResponse(documentReferences, []);
      addMockResponse(documents, []);
      addMockResponse(documents, []);
      addMockResponse(users, []);
      addMockResponse(submissionVersions, [{ status: 'approved', createdAt: new Date() }]);
      addMockResponse(submissionVersions, [{ data: {} }]);
      addMockResponse(documentVersions, []);
      addMockResponse(reviews, []);

      await service.review('user-1', 'sub-1', {
        decision: 'approve',
      });

      expect(enqueueNotification).toHaveBeenCalledWith(
        txMock,
        expect.objectContaining({
          email: null,
        }),
      );
    });
  });
});
