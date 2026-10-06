import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  type Database,
  documentVersions,
  reviews,
  submissionVersions,
  submissions,
  users,
  workspaces,
  workspaceMembers,
  notificationOutbox,
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
      onConflictDoNothing: vi.fn().mockReturnThis(),
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

describe('ApplicationsService Unit Test Suite', () => {
  let service: ApplicationsService;
  let dbMock: any;
  let mockResponse: any;
  let configMock: any;

  beforeEach(() => {
    const mocks = createDbMock();
    dbMock = mocks.dbMock;
    mockResponse = mocks.mockResponse;
    configMock = {
      get: vi.fn((key: string) => {
        if (key === 'CITIZEN_WEB_URL') return 'http://citizen';
        if (key === 'PLATFORM_WEB_URL') return 'http://platform';
        return undefined;
      }),
    };
    service = new ApplicationsService(dbMock as unknown as Database, configMock as any);
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
      // Feature 217: one lookup — the form VERSION's generated title + its content. There is no
      // owning service to resolve, and no `kind`.
      mockResponse(
        [
          {
            title: 'Form Title',
            content: {
              schema: { type: 'object' },
              variants: { default: { type: 'Form', elements: [] } },
            },
          },
        ],
        documentVersions,
        'select',
      );
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
        structure: {
          // normalizeContent passes a present schema through verbatim.
          schema: { type: 'object' },
          variants: { default: { type: 'Form', elements: [] } },
        },
        data: { field: 'value' },
        reviewReason: null,
        createdAt: '2026-07-08T12:00:00.000Z',
        updatedAt: '2026-07-08T12:10:00.000Z',
        submittedAt: null,
      });
    });

    it('falls back to a null title and an empty document when the form version is missing', async () => {
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
      mockResponse([], documentVersions, 'select'); // form version details (empty -> formVer undefined)
      mockResponse([{ reason: 'Some reason' }], reviews, 'select'); // latestReviewReason -> reviews select

      const result = await service.getDetail('user-1', 'sub-1');

      expect(result).toEqual({
        id: 'sub-1',
        reference: expect.any(String),
        status: 'draft',
        statusLabel: 'Draft',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        formTitle: null, // no version row → no generated title
        structure: {
          schema: { type: 'object', properties: {} },
          variants: { default: { type: 'Form', elements: [] } },
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
        content: {
          schema: {
            type: 'object',
            properties: { age: { type: 'number' } },
            required: ['age'],
          },
          // Doc 275: content without a default variant is malformed and falls back to an empty
          // document, which would validate anything — so the fixture carries one.
          variants: { default: { type: 'Form', elements: [] } },
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
        content: { schema: { type: 'object', properties: { age: { type: 'number' } } } },
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
      mockResponse([{ email: 'citizen@example.com' }], users, 'select'); // owner email query
      mockResponse([{ slug: 'workspace-slug' }], workspaces, 'select'); // workspace slug query
      mockResponse([{ title: 'Service Title' }], documentVersions, 'select'); // form title for the staff message
      mockResponse(
        [{ userId: 'member-1', email: 'member1@example.com' }],
        workspaceMembers,
        'select',
      ); // members query
      mockResponse([submittedVer], submissionVersions, 'update'); // update query
      mockResponse([], notificationOutbox, 'insert'); // citizen notification insert
      mockResponse([], notificationOutbox, 'insert'); // staff notification insert

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
      // A content row with no schema half — normalizeContent supplies the empty defaults.
      const formSchema = { content: {} };
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

    it('should submit successfully even if workspace is not found or has no slug but members exist', async () => {
      const sub = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
      };
      const ver = { id: 'ver-1', status: 'draft' };
      // A content row with no schema half — normalizeContent supplies the empty defaults.
      const formSchema = { content: {} };
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
      mockResponse([{ email: 'citizen@example.com' }], users, 'select'); // owner email
      mockResponse([], workspaces, 'select'); // workspace is undefined
      mockResponse([{ title: 'Service Title' }], documentVersions, 'select'); // form title
      mockResponse(
        [{ userId: 'member-1', email: 'member1@example.com' }],
        workspaceMembers,
        'select',
      ); // members exist
      mockResponse([submittedVer], submissionVersions, 'update'); // update query
      mockResponse([], notificationOutbox, 'insert'); // citizen notification
      mockResponse([], notificationOutbox, 'insert'); // staff notification

      const result = await service.submit('user-1', 'sub-1', {});

      expect(result.status).toBe('pending');
    });
  });

  describe('listMine', () => {
    /**
     * Feature 217: `toMyApplication` used to resolve the OWNING SERVICE through the form's
     * `application_form` reference, and returned null — hiding the row — when there was none.
     * There is no service to name now, and every one of the citizen's applications is listed.
     */
    it('lists every owned submission, identified by the form it was made on', async () => {
      const sub1 = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
        updatedAt: new Date('2026-07-08T12:05:00.000Z'),
      };

      mockResponse([sub1], submissions, 'select'); // listMine submissions query
      mockResponse([{ title: 'Form 1' }], documentVersions, 'select'); // form version title
      mockResponse(
        [{ status: 'draft', updatedAt: new Date('2026-07-08T12:10:00.000Z') }],
        submissionVersions,
        'select',
      ); // latestVersion

      const result = await service.listMine('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'sub-1',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        formTitle: 'Form 1',
        reference: expect.any(String),
        status: 'draft',
        statusLabel: 'Draft',
        lastUpdated: '2026-07-08T12:10:00.000Z',
      });
    });

    it('no longer hides a submission whose form has no owning service', async () => {
      const sub1 = {
        id: 'sub-1',
        documentId: 'doc-1',
        documentVersionId: 'fv-1',
        createdAt: new Date('2026-07-08T12:00:00.000Z'),
        updatedAt: new Date('2026-07-08T12:05:00.000Z'),
      };

      mockResponse([sub1], submissions, 'select');
      mockResponse([], documentVersions, 'select'); // no form version row
      mockResponse([], submissionVersions, 'select'); // latestVersion (empty -> ver undefined)

      const result = await service.listMine('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'sub-1',
        formId: 'doc-1',
        formVersionId: 'fv-1',
        formTitle: null,
        reference: expect.any(String),
        status: 'draft',
        statusLabel: 'Draft',
        lastUpdated: '2026-07-08T12:05:00.000Z', // falls back to sub.updatedAt
      });
    });
  });
});
