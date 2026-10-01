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
import { createSelectBuilder } from '../../../../utils/create-select-builder';
import { createMockResponse } from '../../../../utils/create-mock-response';
import { createMockDb } from '../../../../utils/create-db-mock';

vi.mock('../../../../../src/notifications/enqueue', () => ({
  enqueueNotification: vi.fn(),
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const original = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...original,
    or: (...args: any[]) => {
      if ((globalThis as any).mockOrUndefined) {
        return undefined as any;
      }
      return original.or(...args);
    },
  };
});

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let dbMock: any;
  let txMock: any;
  let configMock: any;
  let tableResponses: Map<any, any[]>;

  beforeEach(() => {
    vi.clearAllMocks();
    tableResponses = new Map();

    const mocks = createMockDb();
    txMock = mocks.txMock;
    dbMock = {
      ...mocks.dbMock,
      select: vi
        .fn()
        .mockImplementation((selector?: any) => createSelectBuilder(tableResponses, selector)),
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
      createMockResponse(tableResponses, workspaceMembers, []);

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

      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, submissions, [{ count: 1 }]);

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

      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, submissions, [mockSub1, mockSub2]);
      createMockResponse(tableResponses, submissions, [{ count: 2 }]);

      // query status 'pending'
      const result = await service.list('user-1', {
        workspaceId: 'ws-1',
        status: 'pending',
      } as any);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.id).toBe('sub-1');
    });

    it('filters list of submissions by search query q', async () => {
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

      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, submissions, [{ count: 1 }]);

      const result = await service.list('user-1', {
        workspaceId: 'ws-1',
        q: 'Jane',
        sort: 'updated',
        order: 'asc',
        limit: 10,
        offset: 0,
      } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('handles whitespace search query q and sort by status', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: null,
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
        serviceId: null,
        serviceTitle: null,
        formTitle: null,
        applicantName: null,
        applicantEmail: null,
        status: 'pending',
        submittedAt: null,
      };

      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, submissions, []);

      const result = await service.list('user-1', {
        workspaceId: 'ws-1',
        q: '   ',
        sort: 'status',
        order: 'desc',
        limit: 10,
        offset: 0,
      } as any);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.serviceId).toBe('');
      expect(result.items[0]?.serviceTitle).toBe('Service');
      expect(result.items[0]?.formTitle).toBe('Form');
      expect(result.items[0]?.applicantName).toBe('Anonymous');
      expect(result.items[0]?.applicantEmail).toBeNull();
      expect(result.items[0]?.submittedAt).toBeNull();
      expect(result.total).toBe(0);
    });
  });

  describe('get', () => {
    it('throws NotFoundException if the submission does not exist', async () => {
      createMockResponse(tableResponses, submissions, []);

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if the user is not a member of the workspace', async () => {
      const mockSub = { id: 'sub-1', workspaceId: 'ws-1' };
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, []);

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if toSummary returns null', async () => {
      const mockSub = { id: 'sub-1', workspaceId: 'ws-1' };
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
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

      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, documentReferences, [{ serviceId: 'doc-svc-1' }]);
      createMockResponse(tableResponses, documents, [{ title: 'My Service' }]); // toSummary (service)
      createMockResponse(tableResponses, documents, [{ title: 'My Form' }]); // toSummary (form)
      createMockResponse(tableResponses, users, [
        { displayName: 'Jane Doe', email: 'jane@example.com' },
      ]); // toSummary (user)
      createMockResponse(tableResponses, submissionVersions, [
        {
          status: 'pending',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]); // toSummary (latestVersion)
      createMockResponse(tableResponses, submissionVersions, [{ data: { name: 'Jane' } }]); // get (latestVersion data)
      createMockResponse(tableResponses, documentVersions, [
        {
          kind: 'basic-form',
          schema: { type: 'object' },
        },
      ]); // get (documentVersions schema/kind)
      createMockResponse(tableResponses, reviews, [
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
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, submissionVersions, [{ id: 'ver-1', status: 'approved' }]);

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
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
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

      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, submissionVersions, [{ id: 'ver-1', status: 'pending' }]);

      // txMock return insert review
      txMock.returning.mockResolvedValueOnce([{ id: 'review-1' }]);

      // get() mocks:
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, documentReferences, [{ serviceId: 'doc-svc-1' }]);
      createMockResponse(tableResponses, documents, [{ title: 'My Service' }]);
      createMockResponse(tableResponses, documents, [{ title: 'My Form' }]);
      createMockResponse(tableResponses, users, []); // anonymous applicant
      createMockResponse(tableResponses, submissionVersions, [
        {
          status: 'approved',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]);
      createMockResponse(tableResponses, submissionVersions, [{ data: {} }]);
      createMockResponse(tableResponses, documentVersions, [{ kind: 'basic-form', schema: {} }]);
      createMockResponse(tableResponses, reviews, [
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

      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, submissionVersions, [{ id: 'ver-1', status: 'pending' }]);
      createMockResponse(tableResponses, users, [{ email: 'jane@example.com' }]); // resolve owner's contact email

      // txMock return insert review
      txMock.returning.mockResolvedValueOnce([{ id: 'review-1' }]);

      // get() mocks:
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, documentReferences, [{ serviceId: 'doc-svc-1' }]);
      createMockResponse(tableResponses, documents, [{ title: 'My Service' }]);
      createMockResponse(tableResponses, documents, [{ title: 'My Form' }]);
      createMockResponse(tableResponses, users, [
        { displayName: 'Jane Doe', email: 'jane@example.com' },
      ]);
      createMockResponse(tableResponses, submissionVersions, [
        {
          status: 'approved',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]);
      createMockResponse(tableResponses, submissionVersions, [{ data: {} }]);
      createMockResponse(tableResponses, documentVersions, [{ kind: 'basic-form', schema: {} }]);
      createMockResponse(tableResponses, reviews, []);

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

      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, submissions, [{ count: 1 }]);

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

      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, documentReferences, []);
      createMockResponse(tableResponses, documents, []);
      createMockResponse(tableResponses, documents, []);
      createMockResponse(tableResponses, users, []);
      createMockResponse(tableResponses, submissionVersions, [
        {
          status: 'pending',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]);
      createMockResponse(tableResponses, submissionVersions, []);
      createMockResponse(tableResponses, documentVersions, []);
      createMockResponse(tableResponses, reviews, []);

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

      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, submissionVersions, [{ id: 'ver-1', status: 'pending' }]);
      createMockResponse(tableResponses, users, []);

      txMock.returning.mockResolvedValueOnce([{ id: 'review-1' }]);

      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, documentReferences, []);
      createMockResponse(tableResponses, documents, []);
      createMockResponse(tableResponses, documents, []);
      createMockResponse(tableResponses, users, []);
      createMockResponse(tableResponses, submissionVersions, [
        { status: 'approved', createdAt: new Date() },
      ]);
      createMockResponse(tableResponses, submissionVersions, [{ data: {} }]);
      createMockResponse(tableResponses, documentVersions, []);
      createMockResponse(tableResponses, reviews, []);

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

    it('handles list with search query when search expression is falsy', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'applicant-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
        status: 'pending',
        submittedAt: new Date('2026-07-28T00:00:00Z'),
        versionUpdatedAt: null,
      };

      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, submissions, [{ count: 1 }]);

      (globalThis as any).mockOrUndefined = true;
      try {
        const result = await service.list('user-1', {
          workspaceId: 'ws-1',
          q: 'Jane',
        } as any);
        expect(result.items).toHaveLength(1);
      } finally {
        (globalThis as any).mockOrUndefined = false;
      }
    });

    it('uses draft status when latestVersion returns null in toSummary', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      createMockResponse(tableResponses, submissions, [mockSub]);
      createMockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      createMockResponse(tableResponses, documentReferences, []);
      createMockResponse(tableResponses, documents, []);
      createMockResponse(tableResponses, documents, []);
      createMockResponse(tableResponses, users, []);
      createMockResponse(tableResponses, submissionVersions, []); // latestVersion returns null -> status falls back to draft

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });
  });
});
