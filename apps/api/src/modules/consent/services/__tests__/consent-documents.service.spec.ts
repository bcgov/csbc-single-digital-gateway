import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { type Database, schema } from '@repo/db';
import { ConsentDocumentsService } from '../consent-documents.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DOC_ID = 'doc-uuid-1';
const VERSION_ID = 'version-uuid-1';
const VERSION_ID_2 = 'version-uuid-2';
const USER_ID = 'user-uuid-1';
const DOC_TYPE_ID = 'type-uuid-1';
const DOC_TYPE_VERSION_ID = 'type-version-uuid-1';
const ORG_UNIT_ID = 'org-unit-uuid-1';
const TRANSLATION_ID = 'translation-uuid-1';

const NOW = new Date('2024-06-01T00:00:00.000Z');

const makeDoc = (overrides: Record<string, unknown> = {}) => ({
  id: DOC_ID,
  consentDocumentTypeId: DOC_TYPE_ID,
  orgUnitId: ORG_UNIT_ID,
  publishedConsentDocumentVersionId: null as string | null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeVersion = (overrides: Record<string, unknown> = {}) => ({
  id: VERSION_ID,
  consentDocumentId: DOC_ID,
  consentDocumentTypeVersionId: DOC_TYPE_VERSION_ID,
  version: 1,
  status: 'draft',
  publishedAt: null as Date | null,
  archivedAt: null as Date | null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeTranslation = (overrides: Record<string, unknown> = {}) => ({
  id: TRANSLATION_ID,
  consentDocumentVersionId: VERSION_ID,
  locale: 'en',
  name: 'My Consent Document',
  description: 'A consent document description',
  content: { key: 'value' },
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

// ---------------------------------------------------------------------------
// DB mock factory
//
// Every Drizzle chain terminates at a queue. Tests enqueue results in the
// ORDER the service calls them. All terminals for a given "concept" share one
// queue so tests only need to enqueue([result1], [result2], ...) in call order.
//
// Queue map:
//   selectQ     – outer db.select() terminations (limit / offset / orderBy / where)
//   txSelectQ   – tx.select() terminations
//   insertQ     – db.insert().values().returning() AND db.insert().values() (void)
//   onConflictQ – db.insert().values().onConflictDoUpdate().returning()
//   txInsertQ   – tx.insert().values().returning() AND tx.insert().values() (void)
//   updateQ     – db.update().set().where() and ...where().returning()
//   txUpdateQ   – tx.update().set().where() and ...where().returning()
//   deleteQ     – db.delete().where()
//
// Key design rule:
//   - `where()` / `orderBy()` / `limit()` / `offset()` are all THENABLE.
//     Whichever one the service code awaits will dequeue one item.
//   - `.returning()` dequeues one item independently.
//   - When service code does `await chain.where().returning()` it calls
//     `.returning()` → dequeues one item.  The `.then` on `where()`'s result
//     is never called because JS awaits the return value of `.returning()`.
// ---------------------------------------------------------------------------

type Queue = unknown[][];

const makeQueue = () => {
  const q: Queue = [];
  return {
    enqueue: (...items: unknown[][]) => items.forEach((v) => q.push(v)),
    dequeue: (): Promise<unknown[]> => {
      if (q.length === 0)
        throw new Error('Queue is empty — enqueue a result for this DB call');
      return Promise.resolve(q.shift()!);
    },
  };
};

type Q = ReturnType<typeof makeQueue>;

/** Returns a plain thenable (not a jest.fn) that dequeues from q when awaited. */
const thenableLeaf = (q: Q) => ({
  then: (
    resolve: (v: unknown[]) => unknown,
    reject: (e: unknown) => unknown,
  ) => q.dequeue().then(resolve as (v: unknown) => unknown, reject),
});

/** Builds a select chain where every terminal node dequeues from q. */
const buildSelectChain = (q: Q) => {
  // Offset: terminal when awaited
  const offsetNode = jest.fn().mockImplementation(() => thenableLeaf(q));

  // Limit: terminal when awaited; also returns { offset } for paginated queries
  const limitNode = jest.fn().mockImplementation(() =>
    Object.assign({ offset: offsetNode }, thenableLeaf(q)),
  );

  // OrderBy: terminal when awaited (.orderBy() used without .limit() in findById)
  const orderByNode = jest.fn().mockImplementation(() =>
    Object.assign({ limit: limitNode }, thenableLeaf(q)),
  );

  // Where: terminal when awaited (count queries / translations without limit)
  // Also returns { limit, orderBy } for further chaining
  const whereNode = jest.fn().mockImplementation(() =>
    Object.assign({ limit: limitNode, orderBy: orderByNode }, thenableLeaf(q)),
  );

  const innerJoinNode = jest.fn().mockReturnValue({
    where: whereNode,
    orderBy: orderByNode,
  });

  const fromNode = jest.fn().mockReturnValue({
    where: whereNode,
    innerJoin: innerJoinNode,
    orderBy: orderByNode,
  });

  return { fromNode, whereNode, orderByNode, limitNode, offsetNode, innerJoinNode };
};

const createDbMock = () => {
  const selectQ = makeQueue();
  const txSelectQ = makeQueue();
  const insertQ = makeQueue();
  const onConflictQ = makeQueue();
  const txInsertQ = makeQueue();
  const updateQ = makeQueue();
  const txUpdateQ = makeQueue();
  const deleteQ = makeQueue();

  // ---- Outer select ----------------------------------------------------------
  const selectMock = jest.fn().mockImplementation(() => {
    const chain = buildSelectChain(selectQ);
    return { from: chain.fromNode };
  });

  // ---- Tx select -------------------------------------------------------------
  const txSelectMock = jest.fn().mockImplementation(() => {
    const chain = buildSelectChain(txSelectQ);
    return { from: chain.fromNode };
  });

  // ---- Outer insert ----------------------------------------------------------
  // insert().values().returning() → dequeues from insertQ
  // insert().values()             → also dequeues from insertQ (void case)
  const insertReturning = jest.fn().mockImplementation(() => insertQ.dequeue());
  const insertOnConflictReturning = jest.fn().mockImplementation(() => onConflictQ.dequeue());
  const insertOnConflictDoUpdate = jest.fn().mockReturnValue({
    returning: insertOnConflictReturning,
  });
  const insertValues = jest.fn().mockImplementation(() =>
    Object.assign(thenableLeaf(insertQ), {
      returning: insertReturning,
      onConflictDoUpdate: insertOnConflictDoUpdate,
    }),
  );
  const insertMock = jest.fn().mockReturnValue({ values: insertValues });

  // ---- Tx insert -------------------------------------------------------------
  // Same pattern — values() is thenable (void await), returning() dequeues
  const txInsertReturning = jest.fn().mockImplementation(() => txInsertQ.dequeue());
  const txInsertValues = jest.fn().mockImplementation(() =>
    Object.assign(thenableLeaf(txInsertQ), {
      returning: txInsertReturning,
    }),
  );
  const txInsertMock = jest.fn().mockReturnValue({ values: txInsertValues });

  // ---- Outer update ----------------------------------------------------------
  // update().set().where()           → dequeues from updateQ when awaited
  // update().set().where().returning() → returning() dequeues from updateQ
  const updateReturning = jest.fn().mockImplementation(() => updateQ.dequeue());
  const updateWhere = jest.fn().mockImplementation(() => ({
    then: (
      resolve: (v: unknown[]) => unknown,
      reject: (e: unknown) => unknown,
    ) => updateQ.dequeue().then(resolve as (v: unknown) => unknown, reject),
    returning: updateReturning,
  }));
  const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
  const updateMock = jest.fn().mockReturnValue({ set: updateSet });

  // ---- Tx update -------------------------------------------------------------
  const txUpdateReturning = jest.fn().mockImplementation(() => txUpdateQ.dequeue());
  const txUpdateWhere = jest.fn().mockImplementation(() => ({
    then: (
      resolve: (v: unknown[]) => unknown,
      reject: (e: unknown) => unknown,
    ) => txUpdateQ.dequeue().then(resolve as (v: unknown) => unknown, reject),
    returning: txUpdateReturning,
  }));
  const txUpdateSet = jest.fn().mockReturnValue({ where: txUpdateWhere });
  const txUpdateMock = jest.fn().mockReturnValue({ set: txUpdateSet });

  // ---- Delete ----------------------------------------------------------------
  const deleteWhere = jest.fn().mockImplementation(() => deleteQ.dequeue());
  const deleteMock = jest.fn().mockReturnValue({ where: deleteWhere });

  // ---- Transaction -----------------------------------------------------------
  const tx = {
    select: txSelectMock,
    insert: txInsertMock,
    update: txUpdateMock,
    // expose for assertions
    insertValues: txInsertValues,
    updateSet: txUpdateSet,
    updateWhere: txUpdateWhere,
    updateReturning: txUpdateReturning,
  };

  const transactionMock = jest.fn(async (cb: (txArg: typeof tx) => unknown) => {
    return await cb(tx);
  });

  const db = {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    transaction: transactionMock,
  };

  return {
    db,
    enqueueSelect: (...results: unknown[][]) => selectQ.enqueue(...results),
    enqueueTxSelect: (...results: unknown[][]) => txSelectQ.enqueue(...results),
    enqueueInsert: (...results: unknown[][]) => insertQ.enqueue(...results),
    enqueueOnConflict: (...results: unknown[][]) => onConflictQ.enqueue(...results),
    enqueueTxInsert: (...results: unknown[][]) => txInsertQ.enqueue(...results),
    enqueueUpdate: (...results: unknown[][]) => updateQ.enqueue(...results),
    enqueueTxUpdate: (...results: unknown[][]) => txUpdateQ.enqueue(...results),
    enqueueDelete: (...results: unknown[][]) => deleteQ.enqueue(...results),
    // mocks exposed for call assertions
    insertMock,
    insertValues,
    insertOnConflictDoUpdate,
    updateMock,
    updateSet,
    updateWhere,
    deleteMock,
    deleteWhere,
    tx,
  };
};

const buildService = (mocks: ReturnType<typeof createDbMock>) =>
  new ConsentDocumentsService(mocks.db as unknown as Database);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConsentDocumentsService', () => {
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    describe('when consent document type does not exist', () => {
      it('should throw NotFoundException with the consent document type id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]); // type not found

        const service = buildService(mocks);

        await expect(
          service.create(
            { consentDocumentTypeId: DOC_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'My Consent Doc' },
            USER_ID,
            true,
          ),
        ).rejects.toThrow(
          new NotFoundException(`Consent document type ${DOC_TYPE_ID} not found`),
        );
      });
    });

    describe('when staff user is not a member of the org unit', () => {
      it('should throw ForbiddenException', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect(
          [{ id: DOC_TYPE_ID }], // type found
          [],                     // no membership
        );

        const service = buildService(mocks);

        await expect(
          service.create(
            { consentDocumentTypeId: DOC_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'Staff Doc' },
            USER_ID,
            false,
          ),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('when admin user — skips org membership check', () => {
      it('should enter transaction without querying org membership', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([{ id: DOC_TYPE_ID }]);
        // tx: doc insert (returning), contributor insert (void), type version select (no version)
        mocks.enqueueTxInsert([makeDoc()], []);
        mocks.enqueueTxSelect([]);

        const service = buildService(mocks);
        await service.create(
          { consentDocumentTypeId: DOC_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'Admin Doc' },
          USER_ID,
          true,
        );

        expect(mocks.db.select).toHaveBeenCalledTimes(1);
        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('when no published type version exists in transaction', () => {
      it('should return document without version and log a warning', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([{ id: DOC_TYPE_ID }]);
        mocks.enqueueTxInsert([makeDoc()], []);
        mocks.enqueueTxSelect([]);

        const service = buildService(mocks);
        const result = await service.create(
          { consentDocumentTypeId: DOC_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'My Consent Doc' },
          USER_ID,
          true,
        );

        expect(result).toEqual(makeDoc());
        expect((result as { version?: unknown }).version).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(
          `No published type version for type ${DOC_TYPE_ID} — skipping auto-version`,
        );
        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('when a published type version exists', () => {
      it('should insert doc, contributor, version, and translation and return composed object', async () => {
        const mocks = createDbMock();
        const doc = makeDoc();
        const ver = makeVersion();
        const trn = makeTranslation();

        mocks.enqueueSelect([{ id: DOC_TYPE_ID }]);
        // tx queue order: doc.returning(), contributor void, version.returning(), translation.returning()
        mocks.enqueueTxInsert([doc], [], [ver], [trn]);
        mocks.enqueueTxSelect([{ id: DOC_TYPE_VERSION_ID }]);

        const service = buildService(mocks);
        const result = await service.create(
          {
            consentDocumentTypeId: DOC_TYPE_ID,
            orgUnitId: ORG_UNIT_ID,
            name: 'My Consent Doc',
            description: 'A consent document description',
            content: { key: 'value' },
          },
          USER_ID,
          true,
        );

        expect(result).toMatchObject({
          id: DOC_ID,
          version: {
            id: VERSION_ID,
            status: 'draft',
            translations: [trn],
          },
        });
        expect(warnSpy).not.toHaveBeenCalled();
        expect(mocks.tx.insertValues).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'owner', userId: USER_ID }),
        );
      });

      it('should check org membership for staff and enter transaction on success', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect(
          [{ id: DOC_TYPE_ID }],
          [{ orgUnitId: ORG_UNIT_ID }],
        );
        mocks.enqueueTxInsert([makeDoc()], []);
        mocks.enqueueTxSelect([]);

        const service = buildService(mocks);
        const result = await service.create(
          { consentDocumentTypeId: DOC_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'Staff Doc' },
          USER_ID,
          false,
        );

        expect(result).toMatchObject({ id: DOC_ID });
        expect(mocks.db.select).toHaveBeenCalledTimes(2);
        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
      });

      it('should default content to empty object and description to null when not supplied', async () => {
        const mocks = createDbMock();
        const doc = makeDoc();
        const ver = makeVersion();
        const trn = makeTranslation({ content: {}, description: null });

        mocks.enqueueSelect([{ id: DOC_TYPE_ID }]);
        mocks.enqueueTxInsert([doc], [], [ver], [trn]);
        mocks.enqueueTxSelect([{ id: DOC_TYPE_VERSION_ID }]);

        const service = buildService(mocks);
        await service.create(
          { consentDocumentTypeId: DOC_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'My Consent Doc' },
          USER_ID,
          true,
        );

        expect(mocks.tx.insertValues).toHaveBeenCalledWith(
          expect.objectContaining({ content: {}, description: null, locale: 'en' }),
        );
      });

      it('should insert contributor with consentDocumentId from the inserted doc', async () => {
        const mocks = createDbMock();
        const doc = makeDoc();
        const ver = makeVersion();
        const trn = makeTranslation();

        mocks.enqueueSelect([{ id: DOC_TYPE_ID }]);
        mocks.enqueueTxInsert([doc], [], [ver], [trn]);
        mocks.enqueueTxSelect([{ id: DOC_TYPE_VERSION_ID }]);

        const service = buildService(mocks);
        await service.create(
          { consentDocumentTypeId: DOC_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'My Consent Doc' },
          USER_ID,
          true,
        );

        expect(mocks.tx.insertValues).toHaveBeenCalledWith(
          expect.objectContaining({ consentDocumentId: DOC_ID }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    describe('admin user', () => {
      it('should return documents enriched with name/description from published version translation', async () => {
        const mocks = createDbMock();
        const doc = makeDoc({ publishedConsentDocumentVersionId: VERSION_ID });

        mocks.enqueueSelect(
          [doc],
          [{ count: 1 }],
          [{ name: 'My Consent Doc', description: 'desc' }],
        );

        const service = buildService(mocks);
        const result = await service.findAll(1, 10, {}, USER_ID, true);

        expect(result.total).toBe(1);
        expect(result.totalPages).toBe(1);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toMatchObject({
          id: DOC_ID,
          name: 'My Consent Doc',
          description: 'desc',
        });
      });

      it('should fall back to latest version translation when publishedConsentDocumentVersionId is null', async () => {
        const mocks = createDbMock();
        const doc = makeDoc({ publishedConsentDocumentVersionId: null });

        mocks.enqueueSelect(
          [doc],
          [{ count: 1 }],
          [{ name: 'Draft Name', description: null }],
        );

        const service = buildService(mocks);
        const result = await service.findAll(1, 10, {}, USER_ID, true);

        expect(result.data[0].name).toBe('Draft Name');
        expect(result.data[0].description).toBeNull();
      });

      it('should return null name and description when no translation exists at all', async () => {
        const mocks = createDbMock();
        const doc = makeDoc({ publishedConsentDocumentVersionId: null });

        mocks.enqueueSelect([doc], [{ count: 1 }], []);

        const service = buildService(mocks);
        const result = await service.findAll(1, 10, {}, USER_ID, true);

        expect(result.data[0].name).toBeNull();
        expect(result.data[0].description).toBeNull();
      });

      it('should return empty data with zero total when no documents match', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 0 }]);

        const service = buildService(mocks);
        const result = await service.findAll(1, 10, {}, USER_ID, true);

        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(0);
        expect(result.totalPages).toBe(0);
      });
    });

    describe('staff user', () => {
      it('should filter to contributor documents and return results', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([makeDoc()], [{ count: 1 }], []);

        const service = buildService(mocks);
        const result = await service.findAll(1, 10, {}, USER_ID, false);

        expect(result.data).toHaveLength(1);
      });
    });

    describe('pagination', () => {
      it('should calculate correct totalPages for page 2 with limit 5 and 12 total', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 12 }]);

        const service = buildService(mocks);
        const result = await service.findAll(2, 5, {}, USER_ID, true);

        expect(result.totalPages).toBe(3); // ceil(12/5) = 3
        expect(result.page).toBe(2);
        expect(result.limit).toBe(5);
      });

      it('should compute correct offset for page 3 limit 10', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 25 }]);

        const service = buildService(mocks);
        const result = await service.findAll(3, 10, {}, USER_ID, true);

        // page 3, limit 10 → offset 20; totalPages = ceil(25/10) = 3
        expect(result.totalPages).toBe(3);
        expect(result.page).toBe(3);
        expect(result.total).toBe(25);
      });
    });

    describe('with filters', () => {
      it('should apply orgUnitId and consentDocumentTypeId filters without throwing', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 0 }]);

        const service = buildService(mocks);
        const result = await service.findAll(
          1,
          10,
          { orgUnitId: ORG_UNIT_ID, consentDocumentTypeId: DOC_TYPE_ID },
          USER_ID,
          true,
        );

        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it('should apply only orgUnitId filter without throwing', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 0 }]);

        const service = buildService(mocks);
        const result = await service.findAll(
          1,
          10,
          { orgUnitId: ORG_UNIT_ID },
          USER_ID,
          true,
        );

        expect(result.data).toHaveLength(0);
      });

      it('should apply only consentDocumentTypeId filter without throwing', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 0 }]);

        const service = buildService(mocks);
        const result = await service.findAll(
          1,
          10,
          { consentDocumentTypeId: DOC_TYPE_ID },
          USER_ID,
          true,
        );

        expect(result.data).toHaveLength(0);
      });
    });

    describe('multiple documents in result', () => {
      it('should enrich each document independently', async () => {
        const mocks = createDbMock();
        const doc1 = makeDoc({ id: 'doc-1', publishedConsentDocumentVersionId: VERSION_ID });
        const doc2 = makeDoc({ id: 'doc-2', publishedConsentDocumentVersionId: null });

        mocks.enqueueSelect(
          [doc1, doc2],
          [{ count: 2 }],
          [{ name: 'Published Doc', description: 'pub desc' }],
          [{ name: 'Draft Doc', description: null }],
        );

        const service = buildService(mocks);
        const result = await service.findAll(1, 10, {}, USER_ID, true);

        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe('Published Doc');
        expect(result.data[1].name).toBe('Draft Doc');
        expect(result.total).toBe(2);
      });
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe('findById', () => {
    describe('when document does not exist', () => {
      it('should throw NotFoundException with the document id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(service.findById(DOC_ID)).rejects.toThrow(
          new NotFoundException(`Consent document ${DOC_ID} not found`),
        );
      });
    });

    describe('when document has a published version', () => {
      it('should return document with publishedVersion including translations, name, and description', async () => {
        const mocks = createDbMock();
        const doc = makeDoc({ publishedConsentDocumentVersionId: VERSION_ID });
        const ver = makeVersion({ status: 'published', publishedAt: NOW });
        const trn = makeTranslation();

        mocks.enqueueSelect(
          [doc],  // document lookup (limit)
          [ver],  // published version lookup (limit)
          [trn],  // translations for published version (where — no limit)
          [ver],  // all version rows (orderBy)
          [{ name: 'My Consent Document', description: 'A consent document description' }], // per-version enrichment (limit)
        );

        const service = buildService(mocks);
        const result = await service.findById(DOC_ID);

        expect(result.id).toBe(DOC_ID);
        expect(result.name).toBe('My Consent Document');
        expect(result.publishedVersion).toMatchObject({
          id: VERSION_ID,
          status: 'published',
          name: 'My Consent Document',
          description: 'A consent document description',
          translations: [trn],
        });
        expect(result.versions).toHaveLength(1);
        expect(result.versions[0]).toMatchObject({ id: VERSION_ID });
      });

      it('should derive top-level name from first translation of published version', async () => {
        const mocks = createDbMock();
        const doc = makeDoc({ publishedConsentDocumentVersionId: VERSION_ID });
        const ver = makeVersion({ status: 'published', publishedAt: NOW });
        const enTrn = makeTranslation({ locale: 'en', name: 'English Name' });
        const frTrn = makeTranslation({ locale: 'fr', name: 'Nom Français' });

        mocks.enqueueSelect(
          [doc],
          [ver],
          [enTrn, frTrn], // translations: first is en
          [ver],
          [{ name: 'English Name', description: 'desc' }],
        );

        const service = buildService(mocks);
        const result = await service.findById(DOC_ID);

        // publishedVersion translations[0] drives the top-level name
        expect(result.name).toBe('English Name');
        expect(result.publishedVersion?.translations).toHaveLength(2);
      });
    });

    describe('when document has no published version', () => {
      it('should return null publishedVersion and fall back to latest version name', async () => {
        const mocks = createDbMock();
        const doc = makeDoc({ publishedConsentDocumentVersionId: null });
        const ver = makeVersion({ id: VERSION_ID_2, version: 2, status: 'draft' });

        mocks.enqueueSelect(
          [doc],
          [ver],  // version list (orderBy)
          [{ name: 'Draft Name', description: 'draft desc' }], // per-version enrichment (limit)
          [{ name: 'Draft Name', description: 'draft desc' }], // fallback name query (limit)
        );

        const service = buildService(mocks);
        const result = await service.findById(DOC_ID);

        expect(result.publishedVersion).toBeNull();
        expect(result.name).toBe('Draft Name');
        expect(result.description).toBe('draft desc');
        expect(result.versions).toHaveLength(1);
      });

      it('should return null name when no versions exist', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect(
          [makeDoc({ publishedConsentDocumentVersionId: null })],
          [], // empty version list (orderBy)
        );

        const service = buildService(mocks);
        const result = await service.findById(DOC_ID);

        expect(result.publishedVersion).toBeNull();
        expect(result.name).toBeNull();
        expect(result.description).toBeNull();
        expect(result.versions).toHaveLength(0);
      });

      it('should return null name when latest version has no translation', async () => {
        const mocks = createDbMock();
        const doc = makeDoc({ publishedConsentDocumentVersionId: null });
        const ver = makeVersion({ id: VERSION_ID_2, version: 1, status: 'draft' });

        mocks.enqueueSelect(
          [doc],
          [ver],  // version list (orderBy)
          [],     // no translation for version enrichment (limit)
          [],     // no translation for fallback name (limit)
        );

        const service = buildService(mocks);
        const result = await service.findById(DOC_ID);

        expect(result.publishedVersion).toBeNull();
        expect(result.name).toBeNull();
        expect(result.description).toBeNull();
      });
    });
  });

  // -------------------------------------------------------------------------
  // createVersion
  // -------------------------------------------------------------------------

  describe('createVersion', () => {
    describe('when document does not exist', () => {
      it('should throw NotFoundException with the document id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(service.createVersion(DOC_ID)).rejects.toThrow(
          new NotFoundException(`Consent document ${DOC_ID} not found`),
        );
      });
    });

    describe('when no published type version exists', () => {
      it('should throw BadRequestException referencing document type', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect(
          [makeDoc()],
          [], // no published type version
        );

        const service = buildService(mocks);

        await expect(service.createVersion(DOC_ID)).rejects.toThrow(
          new BadRequestException('No published type version available for this document type'),
        );
      });
    });

    describe('when previous versions exist with translations', () => {
      it('should create new draft version and copy all translations from previous version', async () => {
        const mocks = createDbMock();
        const prevTranslation = makeTranslation({ consentDocumentVersionId: VERSION_ID });
        const newVersion = makeVersion({ id: VERSION_ID_2, version: 2 });

        mocks.enqueueSelect(
          [makeDoc()],
          [{ id: DOC_TYPE_VERSION_ID }],
          [{ id: VERSION_ID }],    // previous version lookup
          [prevTranslation],       // previous translations
        );
        mocks.enqueueInsert([newVersion], []); // new version + translation copy (void)

        const service = buildService(mocks);
        const result = await service.createVersion(DOC_ID);

        expect(result).toMatchObject({ id: VERSION_ID_2, version: 2, status: 'draft' });
        expect(mocks.insertMock).toHaveBeenCalledTimes(2);
        expect(mocks.insertValues).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              consentDocumentVersionId: VERSION_ID_2,
              locale: 'en',
              name: 'My Consent Document',
            }),
          ]),
        );
      });

      it('should not insert translations when previous version has none', async () => {
        const mocks = createDbMock();
        const newVersion = makeVersion({ id: VERSION_ID_2, version: 2 });

        mocks.enqueueSelect(
          [makeDoc()],
          [{ id: DOC_TYPE_VERSION_ID }],
          [{ id: VERSION_ID }],
          [], // no translations on previous version
        );
        mocks.enqueueInsert([newVersion]);

        const service = buildService(mocks);
        const result = await service.createVersion(DOC_ID);

        expect(result).toMatchObject({ id: VERSION_ID_2 });
        expect(mocks.insertMock).toHaveBeenCalledTimes(1);
        expect(mocks.insertMock).toHaveBeenCalledWith(schema.consentDocumentVersions);
      });
    });

    describe('when no previous versions exist', () => {
      it('should create first version without copying any translations', async () => {
        const mocks = createDbMock();
        const newVersion = makeVersion({ id: VERSION_ID_2, version: 1 });

        mocks.enqueueSelect(
          [makeDoc()],
          [{ id: DOC_TYPE_VERSION_ID }],
          [], // no previous versions
        );
        mocks.enqueueInsert([newVersion]);

        const service = buildService(mocks);
        const result = await service.createVersion(DOC_ID);

        expect(result).toMatchObject({ id: VERSION_ID_2, status: 'draft' });
        expect(mocks.insertMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('when multiple previous translations exist', () => {
      it('should copy all locale translations to the new version', async () => {
        const mocks = createDbMock();
        const enTrn = makeTranslation({ locale: 'en', name: 'English' });
        const frTrn = makeTranslation({ locale: 'fr', name: 'Français' });
        const newVersion = makeVersion({ id: VERSION_ID_2, version: 2 });

        mocks.enqueueSelect(
          [makeDoc()],
          [{ id: DOC_TYPE_VERSION_ID }],
          [{ id: VERSION_ID }],
          [enTrn, frTrn],
        );
        mocks.enqueueInsert([newVersion], []);

        const service = buildService(mocks);
        await service.createVersion(DOC_ID);

        expect(mocks.insertValues).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ locale: 'en', consentDocumentVersionId: VERSION_ID_2 }),
            expect.objectContaining({ locale: 'fr', consentDocumentVersionId: VERSION_ID_2 }),
          ]),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // getVersion
  // -------------------------------------------------------------------------

  describe('getVersion', () => {
    describe('when version does not exist', () => {
      it('should throw NotFoundException with the version id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(service.getVersion(DOC_ID, VERSION_ID)).rejects.toThrow(
          new NotFoundException(`Version ${VERSION_ID} not found`),
        );
      });
    });

    describe('when version exists with translations', () => {
      it('should return version with translations and name/description from first translation', async () => {
        const mocks = createDbMock();
        const ver = makeVersion({ status: 'published' });
        const trn = makeTranslation();

        mocks.enqueueSelect([ver], [trn]);

        const service = buildService(mocks);
        const result = await service.getVersion(DOC_ID, VERSION_ID);

        expect(result).toMatchObject({
          id: VERSION_ID,
          status: 'published',
          name: 'My Consent Document',
          description: 'A consent document description',
          translations: [trn],
        });
      });

      it('should use the first translation for name when multiple locales exist', async () => {
        const mocks = createDbMock();
        const ver = makeVersion();
        const enTrn = makeTranslation({ locale: 'en', name: 'First Translation' });
        const frTrn = makeTranslation({ locale: 'fr', name: 'Deuxième traduction' });

        mocks.enqueueSelect([ver], [enTrn, frTrn]);

        const service = buildService(mocks);
        const result = await service.getVersion(DOC_ID, VERSION_ID);

        expect(result.name).toBe('First Translation');
        expect(result.translations).toHaveLength(2);
      });
    });

    describe('when version has no translations', () => {
      it('should return null name and description with empty translations array', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([makeVersion()], []);

        const service = buildService(mocks);
        const result = await service.getVersion(DOC_ID, VERSION_ID);

        expect(result.name).toBeNull();
        expect(result.description).toBeNull();
        expect(result.translations).toHaveLength(0);
      });
    });

    describe('when version is archived', () => {
      it('should return version data without restriction', async () => {
        const mocks = createDbMock();
        const ver = makeVersion({ status: 'archived', archivedAt: NOW });
        const trn = makeTranslation();

        mocks.enqueueSelect([ver], [trn]);

        const service = buildService(mocks);
        const result = await service.getVersion(DOC_ID, VERSION_ID);

        expect(result.status).toBe('archived');
        expect(result.name).toBe('My Consent Document');
      });
    });
  });

  // -------------------------------------------------------------------------
  // upsertTranslation
  // -------------------------------------------------------------------------

  describe('upsertTranslation', () => {
    describe('when version does not exist', () => {
      it('should throw NotFoundException with the version id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(
          service.upsertTranslation(DOC_ID, VERSION_ID, 'en', {
            name: 'My Consent Doc',
            content: {},
          }),
        ).rejects.toThrow(new NotFoundException(`Version ${VERSION_ID} not found`));
      });
    });

    describe('when version is not draft', () => {
      it('should throw BadRequestException for a published version', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([makeVersion({ status: 'published' })]);

        const service = buildService(mocks);

        await expect(
          service.upsertTranslation(DOC_ID, VERSION_ID, 'en', {
            name: 'Updated',
            content: {},
          }),
        ).rejects.toThrow(
          new BadRequestException('Translations can only be modified on draft versions'),
        );
      });

      it('should throw BadRequestException for an archived version', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([makeVersion({ status: 'archived' })]);

        const service = buildService(mocks);

        await expect(
          service.upsertTranslation(DOC_ID, VERSION_ID, 'fr', {
            name: 'Nom du document',
            content: {},
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when version is draft', () => {
      it('should upsert translation and return the result', async () => {
        const mocks = createDbMock();
        const updatedTrn = makeTranslation({ locale: 'fr', name: 'Mon Document' });

        mocks.enqueueSelect([makeVersion({ status: 'draft' })]);
        mocks.enqueueOnConflict([updatedTrn]);

        const service = buildService(mocks);
        const result = await service.upsertTranslation(DOC_ID, VERSION_ID, 'fr', {
          name: 'Mon Document',
          description: 'Description française',
          content: { lang: 'fr' },
        });

        expect(result).toMatchObject({ name: 'Mon Document', locale: 'fr' });
        expect(mocks.insertMock).toHaveBeenCalledWith(schema.consentDocumentVersionTranslations);
        expect(mocks.insertOnConflictDoUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            set: expect.objectContaining({ name: 'Mon Document' }),
          }),
        );
      });

      it('should default description to null when not provided', async () => {
        const mocks = createDbMock();
        const trn = makeTranslation({ description: null });

        mocks.enqueueSelect([makeVersion({ status: 'draft' })]);
        mocks.enqueueOnConflict([trn]);

        const service = buildService(mocks);
        await service.upsertTranslation(DOC_ID, VERSION_ID, 'en', {
          name: 'My Consent Doc',
          content: { a: 1 },
        });

        expect(mocks.insertValues).toHaveBeenCalledWith(
          expect.objectContaining({ description: null, locale: 'en' }),
        );
      });

      it('should include consentDocumentVersionId in the inserted values', async () => {
        const mocks = createDbMock();
        const trn = makeTranslation();

        mocks.enqueueSelect([makeVersion({ status: 'draft' })]);
        mocks.enqueueOnConflict([trn]);

        const service = buildService(mocks);
        await service.upsertTranslation(DOC_ID, VERSION_ID, 'en', {
          name: 'My Consent Doc',
          content: {},
        });

        expect(mocks.insertValues).toHaveBeenCalledWith(
          expect.objectContaining({ consentDocumentVersionId: VERSION_ID }),
        );
      });

      it('should propagate provided content into the upsert set', async () => {
        const mocks = createDbMock();
        const content = { section: 'privacy', required: true };
        const trn = makeTranslation({ content });

        mocks.enqueueSelect([makeVersion({ status: 'draft' })]);
        mocks.enqueueOnConflict([trn]);

        const service = buildService(mocks);
        await service.upsertTranslation(DOC_ID, VERSION_ID, 'en', {
          name: 'Privacy Doc',
          content,
        });

        expect(mocks.insertOnConflictDoUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            set: expect.objectContaining({ content }),
          }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // publishVersion
  // -------------------------------------------------------------------------

  describe('publishVersion', () => {
    describe('when version does not exist', () => {
      it('should throw NotFoundException inside transaction', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect([]);

        const service = buildService(mocks);

        await expect(service.publishVersion(DOC_ID, VERSION_ID)).rejects.toThrow(
          new NotFoundException(`Version ${VERSION_ID} not found`),
        );
      });
    });

    describe('when version is not draft', () => {
      it('should throw BadRequestException for a published version', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect([makeVersion({ status: 'published' })]);

        const service = buildService(mocks);

        await expect(service.publishVersion(DOC_ID, VERSION_ID)).rejects.toThrow(
          new BadRequestException('Only draft versions can be published'),
        );
      });

      it('should throw BadRequestException for an archived version', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect([makeVersion({ status: 'archived' })]);

        const service = buildService(mocks);

        await expect(service.publishVersion(DOC_ID, VERSION_ID)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('when version has no translations', () => {
      it('should throw BadRequestException requiring at least one translation', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect(
          [makeVersion({ status: 'draft' })],
          [], // no translations
        );

        const service = buildService(mocks);

        await expect(service.publishVersion(DOC_ID, VERSION_ID)).rejects.toThrow(
          new BadRequestException('At least one translation is required before publishing'),
        );
      });
    });

    describe('when a different version is already published', () => {
      it('should archive the old published version then publish the new one', async () => {
        const mocks = createDbMock();
        const publishedResult = makeVersion({ status: 'published', publishedAt: NOW });

        mocks.enqueueTxSelect(
          [makeVersion({ status: 'draft' })],
          [{ id: TRANSLATION_ID }],
          [makeDoc({ publishedConsentDocumentVersionId: VERSION_ID_2 })],
        );
        // 3 updates: archive old (where direct), publish new (returning), update doc FK (where direct)
        mocks.enqueueTxUpdate([], [publishedResult], []);

        const service = buildService(mocks);
        const result = await service.publishVersion(DOC_ID, VERSION_ID);

        expect(result).toMatchObject({ status: 'published' });
        expect(mocks.tx.update).toHaveBeenCalledTimes(3);
        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'archived' }),
        );
        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'published' }),
        );
        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ publishedConsentDocumentVersionId: VERSION_ID }),
        );
      });
    });

    describe('when no version is currently published on the document', () => {
      it('should publish without archiving any prior version', async () => {
        const mocks = createDbMock();
        const publishedResult = makeVersion({ status: 'published', publishedAt: NOW });

        mocks.enqueueTxSelect(
          [makeVersion({ status: 'draft' })],
          [{ id: TRANSLATION_ID }],
          [makeDoc({ publishedConsentDocumentVersionId: null })],
        );
        // 2 updates: publish new (returning), update doc FK (where direct)
        mocks.enqueueTxUpdate([publishedResult], []);

        const service = buildService(mocks);
        const result = await service.publishVersion(DOC_ID, VERSION_ID);

        expect(result).toMatchObject({ status: 'published' });
        expect(mocks.tx.update).toHaveBeenCalledTimes(2);
        expect(mocks.tx.updateSet).not.toHaveBeenCalledWith(
          expect.objectContaining({ status: 'archived' }),
        );
      });

      it('should update the document publishedConsentDocumentVersionId to the new version', async () => {
        const mocks = createDbMock();
        const publishedResult = makeVersion({ status: 'published', publishedAt: NOW });

        mocks.enqueueTxSelect(
          [makeVersion({ status: 'draft' })],
          [{ id: TRANSLATION_ID }],
          [makeDoc({ publishedConsentDocumentVersionId: null })],
        );
        mocks.enqueueTxUpdate([publishedResult], []);

        const service = buildService(mocks);
        await service.publishVersion(DOC_ID, VERSION_ID);

        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ publishedConsentDocumentVersionId: VERSION_ID }),
        );
      });
    });

    describe('when publishedConsentDocumentVersionId matches the version being published', () => {
      it('should not archive and only perform 2 updates', async () => {
        const mocks = createDbMock();
        const publishedResult = makeVersion({ status: 'published', publishedAt: NOW });

        mocks.enqueueTxSelect(
          [makeVersion({ status: 'draft' })],
          [{ id: TRANSLATION_ID }],
          [makeDoc({ publishedConsentDocumentVersionId: VERSION_ID })], // same id
        );
        mocks.enqueueTxUpdate([publishedResult], []);

        const service = buildService(mocks);
        await service.publishVersion(DOC_ID, VERSION_ID);

        expect(mocks.tx.update).toHaveBeenCalledTimes(2);
      });
    });
  });

  // -------------------------------------------------------------------------
  // archiveVersion
  // -------------------------------------------------------------------------

  describe('archiveVersion', () => {
    describe('when version does not exist', () => {
      it('should throw NotFoundException', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect([]);

        const service = buildService(mocks);

        await expect(service.archiveVersion(DOC_ID, VERSION_ID)).rejects.toThrow(
          new NotFoundException(`Version ${VERSION_ID} not found`),
        );
      });
    });

    describe('when version is not published', () => {
      it('should throw BadRequestException for a draft version', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect([makeVersion({ status: 'draft' })]);

        const service = buildService(mocks);

        await expect(service.archiveVersion(DOC_ID, VERSION_ID)).rejects.toThrow(
          new BadRequestException('Only published versions can be archived'),
        );
      });

      it('should throw BadRequestException for an already-archived version', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect([makeVersion({ status: 'archived' })]);

        const service = buildService(mocks);

        await expect(service.archiveVersion(DOC_ID, VERSION_ID)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('when version is published', () => {
      it('should archive version and null out document publishedConsentDocumentVersionId', async () => {
        const mocks = createDbMock();
        const archived = makeVersion({ status: 'archived', archivedAt: NOW });

        mocks.enqueueTxSelect([makeVersion({ status: 'published' })]);
        // 2 updates: archive (returning), null FK (where direct)
        mocks.enqueueTxUpdate([archived], []);

        const service = buildService(mocks);
        const result = await service.archiveVersion(DOC_ID, VERSION_ID);

        expect(result).toMatchObject({ status: 'archived' });
        expect(mocks.tx.update).toHaveBeenCalledTimes(2);
        expect(mocks.tx.update).toHaveBeenCalledWith(schema.consentDocumentVersions);
        expect(mocks.tx.update).toHaveBeenCalledWith(schema.consentDocuments);
        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'archived' }),
        );
        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ publishedConsentDocumentVersionId: null }),
        );
      });

      it('should return the archived version with archivedAt set', async () => {
        const mocks = createDbMock();
        const archived = makeVersion({ status: 'archived', archivedAt: NOW });

        mocks.enqueueTxSelect([makeVersion({ status: 'published' })]);
        mocks.enqueueTxUpdate([archived], []);

        const service = buildService(mocks);
        const result = await service.archiveVersion(DOC_ID, VERSION_ID);

        expect(result.archivedAt).toEqual(NOW);
        expect(result.status).toBe('archived');
      });
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  describe('delete', () => {
    describe('when document does not exist', () => {
      it('should throw NotFoundException with the document id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(service.delete(DOC_ID)).rejects.toThrow(
          new NotFoundException(`Consent document ${DOC_ID} not found`),
        );
      });

      it('should not call update or delete when document is not found', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        try {
          await service.delete(DOC_ID);
        } catch {
          // expected
        }

        expect(mocks.updateMock).not.toHaveBeenCalled();
        expect(mocks.deleteMock).not.toHaveBeenCalled();
      });
    });

    describe('when document exists', () => {
      it('should null the publishedConsentDocumentVersionId FK before deleting', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([{ id: DOC_ID }]);
        mocks.enqueueUpdate([]); // FK null update (void)
        mocks.enqueueDelete([]);

        const service = buildService(mocks);
        await service.delete(DOC_ID);

        expect(mocks.updateMock).toHaveBeenCalledWith(schema.consentDocuments);
        expect(mocks.updateSet).toHaveBeenCalledWith({ publishedConsentDocumentVersionId: null });
        expect(mocks.deleteMock).toHaveBeenCalledWith(schema.consentDocuments);
      });

      it('should call delete after nulling the FK', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([{ id: DOC_ID }]);
        mocks.enqueueUpdate([]);
        mocks.enqueueDelete([]);

        const service = buildService(mocks);
        await service.delete(DOC_ID);

        // Both operations must have been called in order
        expect(mocks.updateMock).toHaveBeenCalledTimes(1);
        expect(mocks.deleteMock).toHaveBeenCalledTimes(1);
      });

      it('should propagate error from FK null update and not proceed to delete', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([{ id: DOC_ID }]);
        mocks.updateWhere.mockRejectedValueOnce(new Error('FK constraint error'));

        const service = buildService(mocks);

        await expect(service.delete(DOC_ID)).rejects.toThrow('FK constraint error');
        expect(mocks.deleteMock).not.toHaveBeenCalled();
      });
    });
  });
});
