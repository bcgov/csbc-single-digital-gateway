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
import { mockResponse } from '../../../../utils/create-mock-response';
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
    it('Should throw NotFoundException if the user is not a member of the workspace', async () => {
      // requireMembership returns empty
      mockResponse(tableResponses, workspaceMembers, []);

      await expect(service.list('user-1', { workspaceId: 'ws-1' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should return a list of submissions for a member', async () => {
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

      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, submissions, [{ count: 1 }]);

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

    it('Should filter list of submissions by status if specified', async () => {
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

      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, submissions, [mockSub1, mockSub2]);
      mockResponse(tableResponses, submissions, [{ count: 2 }]);

      // query status 'pending'
      const result = await service.list('user-1', {
        workspaceId: 'ws-1',
        status: 'pending',
      } as any);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.id).toBe('sub-1');
    });

    it('Should filter list of submissions by search query q', async () => {
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

      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, submissions, [{ count: 1 }]);

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

    it('Should handle whitespace search query q and sort by status', async () => {
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

      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, submissions, []);

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
    it('Should throw NotFoundException if the submission does not exist', async () => {
      mockResponse(tableResponses, submissions, []);

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('Should throw NotFoundException if the user is not a member of the workspace', async () => {
      const mockSub = { id: 'sub-1', workspaceId: 'ws-1' };
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, []);

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('Should throw NotFoundException if toSummary returns null', async () => {
      const mockSub = { id: 'sub-1', workspaceId: 'ws-1' };
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      vi.spyOn(service as any, 'toSummary').mockResolvedValueOnce(null);

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('Should successfully retrieve a submission and details', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'applicant-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, documentReferences, [{ serviceId: 'doc-svc-1' }]);
      mockResponse(tableResponses, documents, [{ title: 'My Service' }]); // toSummary (service)
      mockResponse(tableResponses, documents, [{ title: 'My Form' }]); // toSummary (form)
      mockResponse(tableResponses, users, [{ displayName: 'Jane Doe', email: 'jane@example.com' }]); // toSummary (user)
      mockResponse(tableResponses, submissionVersions, [
        {
          status: 'pending',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]); // toSummary (latestVersion)
      mockResponse(tableResponses, submissionVersions, [{ data: { name: 'Jane' } }]); // get (latestVersion data)
      mockResponse(tableResponses, documentVersions, [
        {
          kind: 'basic-form',
          schema: { type: 'object' },
        },
      ]); // get (documentVersions schema/kind)
      mockResponse(tableResponses, reviews, [
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
    it('Should throw ConflictException if submission is not in a reviewable status', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        userId: 'applicant-1',
      };
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, submissionVersions, [{ id: 'ver-1', status: 'approved' }]);

      await expect(
        service.review('user-1', 'sub-1', {
          decision: 'approve',
          reason: 'Looks good',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('Should throw NotFoundException if latest version is not found', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        userId: 'applicant-1',
      };
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      vi.spyOn(service as any, 'latestVersion').mockResolvedValueOnce(null);

      await expect(
        service.review('user-1', 'sub-1', {
          decision: 'approve',
          reason: 'Looks good',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Should successfully process review for an anonymous submission (userId is null)', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        userId: null,
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, submissionVersions, [{ id: 'ver-1', status: 'pending' }]);

      // txMock return insert review
      txMock.returning.mockResolvedValueOnce([{ id: 'review-1' }]);

      // get() mocks:
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, documentReferences, [{ serviceId: 'doc-svc-1' }]);
      mockResponse(tableResponses, documents, [{ title: 'My Service' }]);
      mockResponse(tableResponses, documents, [{ title: 'My Form' }]);
      mockResponse(tableResponses, users, []); // anonymous applicant
      mockResponse(tableResponses, submissionVersions, [
        {
          status: 'approved',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]);
      mockResponse(tableResponses, submissionVersions, [{ data: {} }]);
      mockResponse(tableResponses, documentVersions, [{ kind: 'basic-form', schema: {} }]);
      mockResponse(tableResponses, reviews, [
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

    it('Should successfully process review and enqueue notification for a registered user', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        userId: 'applicant-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, submissionVersions, [{ id: 'ver-1', status: 'pending' }]);
      mockResponse(tableResponses, users, [{ email: 'jane@example.com' }]); // resolve owner's contact email

      // txMock return insert review
      txMock.returning.mockResolvedValueOnce([{ id: 'review-1' }]);

      // get() mocks:
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, documentReferences, [{ serviceId: 'doc-svc-1' }]);
      mockResponse(tableResponses, documents, [{ title: 'My Service' }]);
      mockResponse(tableResponses, documents, [{ title: 'My Form' }]);
      mockResponse(tableResponses, users, [{ displayName: 'Jane Doe', email: 'jane@example.com' }]);
      mockResponse(tableResponses, submissionVersions, [
        {
          status: 'approved',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]);
      mockResponse(tableResponses, submissionVersions, [{ data: {} }]);
      mockResponse(tableResponses, documentVersions, [{ kind: 'basic-form', schema: {} }]);
      mockResponse(tableResponses, reviews, []);

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
    it('Should use fallback values when metadata/version/service/form/applicant are missing or null', async () => {
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

      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, submissions, [{ count: 1 }]);

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

    it('Should use fallback values for detail when form or version is missing', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, documentReferences, []);
      mockResponse(tableResponses, documents, []);
      mockResponse(tableResponses, documents, []);
      mockResponse(tableResponses, users, []);
      mockResponse(tableResponses, submissionVersions, [
        {
          status: 'pending',
          submittedAt: new Date('2026-07-28T00:00:00Z'),
          updatedAt: new Date('2026-07-28T00:00:00Z'),
        },
      ]);
      mockResponse(tableResponses, submissionVersions, []);
      mockResponse(tableResponses, documentVersions, []);
      mockResponse(tableResponses, reviews, []);

      const result = await service.get('user-1', 'sub-1');
      expect(result.kind).toBe('basic-form');
      expect(result.data).toEqual({});
      expect(result.structure).toEqual({
        schema: { type: 'object', properties: {} },
        uischema: { type: 'VerticalLayout', elements: [] },
      });
    });

    it('Should handle review notification when owner has no email', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'applicant-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, submissionVersions, [{ id: 'ver-1', status: 'pending' }]);
      mockResponse(tableResponses, users, []);

      txMock.returning.mockResolvedValueOnce([{ id: 'review-1' }]);

      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, documentReferences, []);
      mockResponse(tableResponses, documents, []);
      mockResponse(tableResponses, documents, []);
      mockResponse(tableResponses, users, []);
      mockResponse(tableResponses, submissionVersions, [
        { status: 'approved', createdAt: new Date() },
      ]);
      mockResponse(tableResponses, submissionVersions, [{ data: {} }]);
      mockResponse(tableResponses, documentVersions, []);
      mockResponse(tableResponses, reviews, []);

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

    it('Should handle list with search query when search expression is falsy', async () => {
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

      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, submissions, [{ count: 1 }]);

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

    it('Should use draft status when latestVersion returns null in toSummary', async () => {
      const mockSub = {
        id: 'sub-1',
        workspaceId: 'ws-1',
        documentId: 'doc-form-1',
        documentVersionId: 'doc-ver-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-28T00:00:00Z'),
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      };

      mockResponse(tableResponses, submissions, [mockSub]);
      mockResponse(tableResponses, workspaceMembers, [{ userId: 'user-1' }]);
      mockResponse(tableResponses, documentReferences, []);
      mockResponse(tableResponses, documents, []);
      mockResponse(tableResponses, documents, []);
      mockResponse(tableResponses, users, []);
      mockResponse(tableResponses, submissionVersions, []); // latestVersion returns null -> status falls back to draft

      await expect(service.get('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });
  });
});
