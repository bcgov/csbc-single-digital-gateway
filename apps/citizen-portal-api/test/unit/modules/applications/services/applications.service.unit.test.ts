import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  type Database,
  documentReferences,
  documentVersions,
  documents,
  reviews,
  submissionVersions,
  submissions,
} from '@repo/database';
import { ApplicationsService } from '../../../../../src/modules/applications/services/applications.service';

const createDbMock = () => {
  const mocks: {
    queries: Array<{
      table?: any;
      action?: 'select' | 'insert' | 'update' | undefined;
      resolve: any;
    }>;
  } = {
    queries: [],
  };

  const createBuilder = () => {
    let activeTable: any = null;
    let action: 'select' | 'insert' | 'update' = 'select';

    const builder = {
      select: vi.fn().mockImplementation(() => {
        action = 'select';
        return builder;
      }),
      insert: vi.fn().mockImplementation((table) => {
        action = 'insert';
        activeTable = table;
        return builder;
      }),
      update: vi.fn().mockImplementation((table) => {
        action = 'update';
        activeTable = table;
        return builder;
      }),
      from: vi.fn().mockImplementation((table) => {
        activeTable = table;
        return builder;
      }),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      // eslint-disable-next-line unicorn/no-thenable -- Drizzle ORM queries are thenables; the mock must implement .then() to support direct await
      then: (onfulfilled: any) => {
        const index = mocks.queries.findIndex(
          (q) =>
            (q.table === undefined || q.table === activeTable) &&
            (q.action === undefined || q.action === action),
        );
        let result: any = [];
        if (index !== -1) {
          const entry = mocks.queries[index];
          if (entry !== undefined) {
            result = entry.resolve;
            mocks.queries.splice(index, 1);
          }
        }
        return Promise.resolve(result).then(onfulfilled);
      },
    };
    return builder;
  };

  const dbMock = {
    ...createBuilder(),
    transaction: vi.fn(async (cb: any) => {
      return cb(createBuilder());
    }),
  };

  const mockResponse = (resolve: any, table?: any, action?: 'select' | 'insert' | 'update') => {
    mocks.queries.push({ table, action, resolve });
  };

  return { dbMock, mockResponse };
};

describe('ApplicationsService Unit Tests', () => {
  let service: ApplicationsService;
  let dbMock: any;
  let mockResponse: any;

  beforeEach(() => {
    const mocks = createDbMock();
    dbMock = mocks.dbMock;
    mockResponse = mocks.mockResponse;
    service = new ApplicationsService(dbMock as unknown as Database);
  });

  describe('getApplicationForm', () => {
    it('should throw NotFoundException if service is not found', async () => {
      mockResponse([], documents, 'select'); // no service version found

      await expect(service.getApplicationForm('svc-id', 'form-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if form reference is not found', async () => {
      mockResponse([{ versionId: 'svc-ver-id' }], documents, 'select'); // service found
      mockResponse([], documentReferences, 'select'); // form reference not found

      await expect(service.getApplicationForm('svc-id', 'form-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if form document or version is not found', async () => {
      mockResponse([{ versionId: 'svc-ver-id' }], documents, 'select'); // service found
      mockResponse([{ formVersionId: 'form-ver-id' }], documentReferences, 'select'); // form ref found
      mockResponse([], documentVersions, 'select'); // form details not found

      await expect(service.getApplicationForm('svc-id', 'form-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return normalized form details on success', async () => {
      const mockForm = {
        kind: 'basic-form',
        title: 'Apply Now',
        structure: { schema: { type: 'object' } },
      };

      mockResponse([{ versionId: 'svc-ver-id' }], documents, 'select'); // service found
      mockResponse([{ formVersionId: 'form-ver-id' }], documentReferences, 'select'); // form ref found
      mockResponse([mockForm], documentVersions, 'select'); // form details found

      const result = await service.getApplicationForm('svc-id', 'form-id');

      expect(result).toEqual({
        serviceId: 'svc-id',
        formId: 'form-id',
        formVersionId: 'form-ver-id',
        kind: 'basic-form',
        title: 'Apply Now',
        structure: {
          schema: { type: 'object' },
          uischema: {
            type: 'VerticalLayout',
            elements: [],
          },
        },
      });
    });

    it('should return normalized form details on success even if structure is null', async () => {
      const mockForm = {
        kind: 'basic-form',
        title: 'Apply Now',
        structure: null,
      };

      mockResponse([{ versionId: 'svc-ver-id' }], documents, 'select'); // service found
      mockResponse([{ formVersionId: 'form-ver-id' }], documentReferences, 'select'); // form ref found
      mockResponse([mockForm], documentVersions, 'select'); // form details found

      const result = await service.getApplicationForm('svc-id', 'form-id');

      expect(result).toEqual({
        serviceId: 'svc-id',
        formId: 'form-id',
        formVersionId: 'form-ver-id',
        kind: 'basic-form',
        title: 'Apply Now',
        structure: {
          schema: { type: 'object', properties: {} },
          uischema: {
            type: 'VerticalLayout',
            elements: [],
          },
        },
      });
    });
  });

  describe('createOrResumeDraft', () => {
    it('should throw UnprocessableEntityException if form version is not found or kind is invalid', async () => {
      mockResponse([], documentVersions, 'select'); // form version not found

      await expect(service.createOrResumeDraft('user-1', 'fv-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should resume existing draft if one is found', async () => {
      const fv = { documentId: 'doc-1', kind: 'basic-form', workspaceId: 'ws-1' };
      const existingSub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const existingVer = {
        id: 'ver-1',
        status: 'draft',
        data: { field: 'value' },
        updatedAt: new Date('2026-07-08T12:10:00.000Z'),
        submittedAt: null,
      };

      // 1. check form version
      mockResponse([fv], documentVersions, 'select');
      // 2. findUserDraft steps:
      // - select submissions
      mockResponse([existingSub], submissions, 'select');
      // - latestVersion select inside findUserDraft
      mockResponse([existingVer], submissionVersions, 'select');

      const result = await service.createOrResumeDraft('user-1', 'fv-1');

      expect(result).toEqual({
        id: 'sub-1',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        status: 'draft',
        data: { field: 'value' },
        reference: expect.any(String),
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:10:00.000Z',
        submittedAt: null,
      });
    });

    it('should create a new draft if no existing draft is found', async () => {
      const fv = { documentId: 'doc-1', kind: 'basic-form', workspaceId: 'ws-1' };
      const newSub = {
        id: 'new-sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const newVer = {
        id: 'new-ver-1',
        status: 'draft',
        data: {},
        updatedAt: new Date('2026-07-08T12:10:00.000Z'),
        submittedAt: null,
      };

      // 1. check form version
      mockResponse([fv], documentVersions, 'select');
      // 2. findUserDraft returns null (no submissions found)
      mockResponse([], submissions, 'select');

      // 3. transaction inserts
      mockResponse([newSub], submissions, 'insert'); // insert submissions
      mockResponse([newVer], submissionVersions, 'insert'); // insert submissionVersions

      const result = await service.createOrResumeDraft('user-1', 'fv-1');

      expect(result).toEqual({
        id: 'new-sub-1',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        status: 'draft',
        data: {},
        reference: expect.any(String),
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:10:00.000Z',
        submittedAt: null,
      });
    });

    it('should throw an Error if submission insert returns no row', async () => {
      const fv = { documentId: 'doc-1', kind: 'basic-form', workspaceId: 'ws-1' };

      // 1. check form version
      mockResponse([fv], documentVersions, 'select');
      // 2. findUserDraft returns null (no submissions found)
      mockResponse([], submissions, 'select');
      // 3. transaction insert returns empty
      mockResponse([], submissions, 'insert');

      await expect(service.createOrResumeDraft('user-1', 'fv-1')).rejects.toThrow(
        'submission insert returned no row',
      );
    });

    it('should throw an Error if submission version insert returns no row', async () => {
      const fv = { documentId: 'doc-1', kind: 'basic-form', workspaceId: 'ws-1' };
      const newSub = {
        id: 'new-sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };

      // 1. check form version
      mockResponse([fv], documentVersions, 'select');
      // 2. findUserDraft returns null (no submissions found)
      mockResponse([], submissions, 'select');
      // 3. transaction inserts
      mockResponse([newSub], submissions, 'insert'); // insert submissions
      mockResponse([], submissionVersions, 'insert'); // insert submissionVersions returns empty

      await expect(service.createOrResumeDraft('user-1', 'fv-1')).rejects.toThrow(
        'submission version insert returned no row',
      );
    });
  });

  describe('getDetail', () => {
    it('should throw NotFoundException if submission is not found or not owned by user', async () => {
      mockResponse([], submissions, 'select'); // requireOwn returns empty

      await expect(service.getDetail('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if latest submission version is not found', async () => {
      const sub = { id: 'sub-1', documentId: 'doc-1', userId: 'user-1' };
      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([], submissionVersions, 'select'); // requireLatest -> latestVersion returns null

      await expect(service.getDetail('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });

    it('should return full details on success', async () => {
      const sub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const ver = {
        id: 'ver-1',
        status: 'draft',
        data: { field: 'value' },
        updatedAt: new Date('2026-07-08T12:10:00.000Z'),
        submittedAt: null,
      };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireLatest -> latestVersion
      mockResponse([{ title: 'Form Title', kind: 'basic-form' }], documents, 'select'); // form doc details
      mockResponse([{ schema: { type: 'object' } }], documentVersions, 'select'); // form version details
      mockResponse([{ serviceId: 'svc-1' }], documentReferences, 'select'); // documentReferences relation
      mockResponse([{ title: 'Service Title' }], documents, 'select'); // owning service document
      mockResponse([], reviews, 'select'); // latestReviewReason -> reviews select

      const result = await service.getDetail('user-1', 'sub-1');

      expect(result).toEqual({
        id: 'sub-1',
        reference: expect.any(String),
        status: 'draft',
        statusLabel: 'Draft',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        formTitle: 'Form Title',
        serviceId: 'svc-1',
        serviceTitle: 'Service Title',
        kind: 'basic-form',
        structure: {
          schema: { type: 'object', properties: {} },
          uischema: {
            type: 'VerticalLayout',
            elements: [],
          },
        },
        data: { field: 'value' },
        reviewReason: null,
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:10:00.000Z',
        submittedAt: null,
      });
    });

    it('should return details with default fallback values when form doc, version, reference, or service are missing', async () => {
      const sub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const ver = {
        id: 'ver-1',
        status: 'draft',
        data: { field: 'value' },
        updatedAt: new Date('2026-07-08T12:10:00.000Z'),
        submittedAt: null,
      };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireLatest
      mockResponse([], documents, 'select'); // form doc details (empty -> formDoc undefined)
      mockResponse([], documentVersions, 'select'); // form version details (empty -> formVer undefined)
      mockResponse([], documentReferences, 'select'); // documentReferences relation (empty -> refRows[0] undefined)
      mockResponse([{ reason: 'Some reason' }], reviews, 'select'); // latestReviewReason -> reviews select

      const result = await service.getDetail('user-1', 'sub-1');

      expect(result).toEqual({
        id: 'sub-1',
        reference: expect.any(String),
        status: 'draft',
        statusLabel: 'Draft',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        formTitle: 'Application', // fallback
        serviceId: '', // fallback
        serviceTitle: 'Service', // fallback
        kind: 'basic-form', // fallback
        structure: {
          schema: { type: 'object', properties: {} },
          uischema: {
            type: 'VerticalLayout',
            elements: [],
          },
        },
        data: { field: 'value' },
        reviewReason: 'Some reason',
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:10:00.000Z',
        submittedAt: null,
      });
    });
  });

  describe('revise', () => {
    it('should throw ConflictException if submission is not in needs_changes status', async () => {
      const sub = { id: 'sub-1', userId: 'user-1' };
      const ver = { id: 'ver-1', status: 'draft', version: 1 };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireLatest -> latestVersion

      await expect(service.revise('user-1', 'sub-1')).rejects.toThrow(ConflictException);
    });

    it('should insert new submission version (N+1) with draft status on success', async () => {
      const sub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const ver = {
        id: 'ver-1',
        status: 'needs_changes',
        version: 1,
        workspaceId: 'ws-1',
        data: { a: 1 },
      };
      const newVer = {
        id: 'ver-2',
        status: 'draft',
        version: 2,
        data: { a: 1 },
        updatedAt: new Date('2026-07-08T12:20:00.000Z'),
      };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireLatest
      mockResponse([newVer], submissionVersions, 'insert'); // insert new version

      const result = await service.revise('user-1', 'sub-1');

      expect(result).toEqual({
        id: 'sub-1',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        status: 'draft',
        data: { a: 1 },
        reference: expect.any(String),
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:20:00.000Z',
        submittedAt: null,
      });
    });
  });

  describe('saveDraft', () => {
    it('should throw ConflictException if latest version is not draft', async () => {
      const sub = { id: 'sub-1', userId: 'user-1' };
      const ver = { id: 'ver-1', status: 'pending' };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireLatest -> latestVersion

      await expect(service.saveDraft('user-1', 'sub-1', { data: 1 })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update version data on success', async () => {
      const sub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const ver = { id: 'ver-1', status: 'draft' };
      const updatedVer = {
        id: 'ver-1',
        status: 'draft',
        data: { test: 'yes' },
        updatedAt: new Date('2026-07-08T12:30:00.000Z'),
      };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireDraft -> latestVersion
      mockResponse([updatedVer], submissionVersions, 'update'); // update query

      const result = await service.saveDraft('user-1', 'sub-1', { test: 'yes' });

      expect(result).toEqual({
        id: 'sub-1',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        status: 'draft',
        data: { test: 'yes' },
        reference: expect.any(String),
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:30:00.000Z',
        submittedAt: null,
      });
    });

    it('should throw Error if update returns no row', async () => {
      const sub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const ver = { id: 'ver-1', status: 'draft' };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireDraft -> latestVersion
      mockResponse([], submissionVersions, 'update'); // update query returns empty

      await expect(service.saveDraft('user-1', 'sub-1', { test: 'yes' })).rejects.toThrow(
        'submission version update returned no row',
      );
    });
  });

  describe('submit', () => {
    it('should throw UnprocessableEntityException if validation fails', async () => {
      const sub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        userId: 'user-1',
      };
      const ver = { id: 'ver-1', status: 'draft' };
      const formSchema = {
        kind: 'basic-form',
        structure: {
          schema: {
            type: 'object',
            properties: { age: { type: 'number' } },
            required: ['age'],
          },
        },
      };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireDraft -> latestVersion
      mockResponse([formSchema], documentVersions, 'select'); // loadFormStructure

      await expect(service.submit('user-1', 'sub-1', { age: 'not-a-number' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should update status to pending and set submittedAt on successful validation', async () => {
      const sub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const ver = { id: 'ver-1', status: 'draft' };
      const formSchema = {
        kind: 'basic-form',
        structure: {
          schema: {
            type: 'object',
            properties: { age: { type: 'number' } },
          },
        },
      };
      const submittedVer = {
        id: 'ver-1',
        status: 'pending',
        data: { age: 25 },
        updatedAt: new Date('2026-07-08T12:40:00.000Z'),
        submittedAt: new Date('2026-07-08T12:40:00.000Z'),
      };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireDraft -> latestVersion
      mockResponse([formSchema], documentVersions, 'select'); // loadFormStructure
      mockResponse([submittedVer], submissionVersions, 'update'); // update query

      const result = await service.submit('user-1', 'sub-1', { age: 25 });

      expect(result).toEqual({
        id: 'sub-1',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        status: 'pending',
        data: { age: 25 },
        reference: expect.any(String),
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:40:00.000Z',
        submittedAt: '2026-07-08T12:40:00.000Z',
      });
    });

    it('should throw NotFoundException if form version is not found during submit', async () => {
      const sub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        userId: 'user-1',
      };
      const ver = { id: 'ver-1', status: 'draft' };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireDraft -> latestVersion
      mockResponse([], documentVersions, 'select'); // loadFormStructure returns empty

      await expect(service.submit('user-1', 'sub-1', { age: 25 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should submit successfully even if form schema structure is null', async () => {
      const sub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const ver = { id: 'ver-1', status: 'draft' };
      const formSchema = {
        kind: 'basic-form',
        structure: null,
      };
      const submittedVer = {
        id: 'ver-1',
        status: 'pending',
        data: {},
        updatedAt: new Date('2026-07-08T12:40:00.000Z'),
        submittedAt: new Date('2026-07-08T12:40:00.000Z'),
      };

      mockResponse([sub], submissions, 'select'); // requireOwn
      mockResponse([ver], submissionVersions, 'select'); // requireDraft -> latestVersion
      mockResponse([formSchema], documentVersions, 'select'); // loadFormStructure
      mockResponse([submittedVer], submissionVersions, 'update'); // update query

      const result = await service.submit('user-1', 'sub-1', {});

      expect(result).toEqual({
        id: 'sub-1',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        status: 'pending',
        data: {},
        reference: expect.any(String),
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:40:00.000Z',
        submittedAt: '2026-07-08T12:40:00.000Z',
      });
    });
  });

  describe('listMine', () => {
    it('should list all owned submissions and map to MyApplication DTOS, skipping null entries', async () => {
      const sub1 = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
        updatedAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const sub2 = {
        id: 'sub-2',
        documentId: 'doc-2',
        documentVersionId: 'fv-2',
        createdAt: new Date('2026-07-08T12:05:00.000Z'),
        updatedAt: new Date('2026-07-08T12:05:00.000Z'),
      };

      mockResponse([sub1, sub2], submissions, 'select'); // listMine submissions query

      // toMyApplication for sub1:
      mockResponse(
        [{ serviceId: 'svc-1', serviceVersionId: 'svc-ver-1' }],
        documentReferences,
        'select',
      ); // ref
      mockResponse([{ title: 'Service 1' }], documents, 'select'); // svc doc
      mockResponse([{ title: 'Form 1' }], documents, 'select'); // form doc
      mockResponse(
        [{ status: 'draft', updatedAt: new Date('2026-07-08T12:10:00.000Z') }],
        submissionVersions,
        'select',
      ); // latestVersion

      // toMyApplication for sub2 (let it return empty reference, which skips the item):
      mockResponse([], documentReferences, 'select'); // no reference found

      const result = await service.listMine('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'sub-1',
        serviceId: 'svc-1',
        serviceVersionId: 'svc-ver-1',
        serviceTitle: 'Service 1',
        formTitle: 'Form 1',
        reference: expect.any(String),
        status: 'draft',
        statusLabel: 'Draft',
        lastUpdated: '2026-07-08T12:10:00.000Z',
      });
    });

    it('should fall back to defaults when service, form, or version are missing/undefined', async () => {
      const sub1 = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
        updatedAt: new Date('2026-07-08T12:05:00.000Z'),
      };

      mockResponse([sub1], submissions, 'select'); // listMine submissions query

      // toMyApplication mocks:
      mockResponse(
        [{ serviceId: 'svc-1', serviceVersionId: 'svc-ver-1' }],
        documentReferences,
        'select',
      ); // ref
      mockResponse([], documents, 'select'); // svc doc (empty -> svc undefined)
      mockResponse([], documents, 'select'); // form doc (empty -> form undefined)
      mockResponse([], submissionVersions, 'select'); // latestVersion (empty -> ver undefined)

      const result = await service.listMine('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'sub-1',
        serviceId: 'svc-1',
        serviceVersionId: 'svc-ver-1',
        serviceTitle: 'Service',
        formTitle: 'Application',
        reference: expect.any(String),
        status: 'draft',
        statusLabel: 'Draft',
        lastUpdated: '2026-07-08T12:05:00.000Z', // falls back to sub.updatedAt
      });
    });
  });
});
