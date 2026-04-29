import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { type Database, schema } from '@repo/db';
import { ServicesService } from '../services.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SERVICE_ID = 'service-uuid-1';
const VERSION_ID = 'version-uuid-1';
const VERSION_ID_2 = 'version-uuid-2';
const USER_ID = 'user-uuid-1';
const SERVICE_TYPE_ID = 'type-uuid-1';
const SERVICE_TYPE_VERSION_ID = 'type-version-uuid-1';
const ORG_UNIT_ID = 'org-unit-uuid-1';
const TRANSLATION_ID = 'translation-uuid-1';

const NOW = new Date('2024-06-01T00:00:00.000Z');

const makeService = (overrides: Record<string, unknown> = {}) => ({
  id: SERVICE_ID,
  serviceTypeId: SERVICE_TYPE_ID,
  orgUnitId: ORG_UNIT_ID,
  publishedServiceVersionId: null as string | null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeVersion = (overrides: Record<string, unknown> = {}) => ({
  id: VERSION_ID,
  serviceId: SERVICE_ID,
  serviceTypeVersionId: SERVICE_TYPE_VERSION_ID,
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
  serviceVersionId: VERSION_ID,
  locale: 'en',
  name: 'My Service',
  description: 'A service description',
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
  new ServicesService(mocks.db as unknown as Database);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ServicesService', () => {
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
    describe('when service type does not exist', () => {
      it('should throw NotFoundException with the service type id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]); // type not found

        const service = buildService(mocks);

        await expect(
          service.create(
            { serviceTypeId: SERVICE_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'My Service' },
            USER_ID,
            true,
          ),
        ).rejects.toThrow(new NotFoundException(`Service type ${SERVICE_TYPE_ID} not found`));
      });
    });

    describe('when staff user is not a member of the org unit', () => {
      it('should throw ForbiddenException', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect(
          [{ id: SERVICE_TYPE_ID }], // type found
          [],                         // no membership
        );

        const service = buildService(mocks);

        await expect(
          service.create(
            { serviceTypeId: SERVICE_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'Staff Service' },
            USER_ID,
            false,
          ),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('when admin user — skips org membership check', () => {
      it('should enter transaction without querying org membership', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([{ id: SERVICE_TYPE_ID }]);
        // tx: service insert (returning), contributor insert (void), type version select (no version)
        mocks.enqueueTxInsert([makeService()], []); // service + contributor void
        mocks.enqueueTxSelect([]);

        const service = buildService(mocks);
        await service.create(
          { serviceTypeId: SERVICE_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'Admin Service' },
          USER_ID,
          true,
        );

        expect(mocks.db.select).toHaveBeenCalledTimes(1);
        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('when no published type version exists in transaction', () => {
      it('should return service without version and log a warning', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([{ id: SERVICE_TYPE_ID }]);
        mocks.enqueueTxInsert([makeService()], []);
        mocks.enqueueTxSelect([]);

        const service = buildService(mocks);
        const result = await service.create(
          { serviceTypeId: SERVICE_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'My Service' },
          USER_ID,
          true,
        );

        expect(result).toEqual(makeService());
        expect((result as { version?: unknown }).version).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(
          `No published type version for type ${SERVICE_TYPE_ID} — skipping auto-version`,
        );
        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('when a published type version exists', () => {
      it('should insert service, contributor, version, and translation and return composed object', async () => {
        const mocks = createDbMock();
        const svc = makeService();
        const ver = makeVersion();
        const trn = makeTranslation();

        mocks.enqueueSelect([{ id: SERVICE_TYPE_ID }]);
        // tx queue order: service.returning(), contributor void, version.returning(), translation.returning()
        mocks.enqueueTxInsert([svc], [], [ver], [trn]);
        mocks.enqueueTxSelect([{ id: SERVICE_TYPE_VERSION_ID }]);

        const service = buildService(mocks);
        const result = await service.create(
          {
            serviceTypeId: SERVICE_TYPE_ID,
            orgUnitId: ORG_UNIT_ID,
            name: 'My Service',
            description: 'A service description',
            content: { key: 'value' },
          },
          USER_ID,
          true,
        );

        expect(result).toMatchObject({
          id: SERVICE_ID,
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
          [{ id: SERVICE_TYPE_ID }],
          [{ orgUnitId: ORG_UNIT_ID }],
        );
        mocks.enqueueTxInsert([makeService()], []);
        mocks.enqueueTxSelect([]);

        const service = buildService(mocks);
        const result = await service.create(
          { serviceTypeId: SERVICE_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'Staff Service' },
          USER_ID,
          false,
        );

        expect(result).toMatchObject({ id: SERVICE_ID });
        expect(mocks.db.select).toHaveBeenCalledTimes(2);
        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
      });

      it('should default content to empty object and description to null when not supplied', async () => {
        const mocks = createDbMock();
        const svc = makeService();
        const ver = makeVersion();
        const trn = makeTranslation({ content: {}, description: null });

        mocks.enqueueSelect([{ id: SERVICE_TYPE_ID }]);
        mocks.enqueueTxInsert([svc], [], [ver], [trn]);
        mocks.enqueueTxSelect([{ id: SERVICE_TYPE_VERSION_ID }]);

        const service = buildService(mocks);
        await service.create(
          { serviceTypeId: SERVICE_TYPE_ID, orgUnitId: ORG_UNIT_ID, name: 'My Service' },
          USER_ID,
          true,
        );

        expect(mocks.tx.insertValues).toHaveBeenCalledWith(
          expect.objectContaining({ content: {}, description: null, locale: 'en' }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    describe('admin user', () => {
      it('should return services enriched with name/description from published version translation', async () => {
        const mocks = createDbMock();
        const svc = makeService({ publishedServiceVersionId: VERSION_ID });

        mocks.enqueueSelect(
          [svc],
          [{ count: 1 }],
          [{ name: 'My Service', description: 'desc' }],
        );

        const service = buildService(mocks);
        const result = await service.findAll(1, 10, {}, USER_ID, true);

        expect(result.total).toBe(1);
        expect(result.totalPages).toBe(1);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toMatchObject({
          id: SERVICE_ID,
          name: 'My Service',
          description: 'desc',
        });
      });

      it('should fall back to latest version translation when publishedServiceVersionId is null', async () => {
        const mocks = createDbMock();
        const svc = makeService({ publishedServiceVersionId: null });

        mocks.enqueueSelect(
          [svc],
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
        const svc = makeService({ publishedServiceVersionId: null });

        mocks.enqueueSelect([svc], [{ count: 1 }], []);

        const service = buildService(mocks);
        const result = await service.findAll(1, 10, {}, USER_ID, true);

        expect(result.data[0].name).toBeNull();
        expect(result.data[0].description).toBeNull();
      });

      it('should return empty data with zero total when no services match', async () => {
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
      it('should filter to contributor services and return results', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([makeService()], [{ count: 1 }], []);

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
    });

    describe('with filters', () => {
      it('should apply orgUnitId and serviceTypeId filters without throwing', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 0 }]);

        const service = buildService(mocks);
        const result = await service.findAll(
          1,
          10,
          { orgUnitId: ORG_UNIT_ID, serviceTypeId: SERVICE_TYPE_ID },
          USER_ID,
          true,
        );

        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe('findById', () => {
    describe('when service does not exist', () => {
      it('should throw NotFoundException with the service id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(service.findById(SERVICE_ID)).rejects.toThrow(
          new NotFoundException(`Service ${SERVICE_ID} not found`),
        );
      });
    });

    describe('when service has a published version', () => {
      it('should return service with publishedVersion including translations, name, and description', async () => {
        const mocks = createDbMock();
        const svc = makeService({ publishedServiceVersionId: VERSION_ID });
        const ver = makeVersion({ status: 'published', publishedAt: NOW });
        const trn = makeTranslation();

        mocks.enqueueSelect(
          [svc],  // service lookup (limit)
          [ver],  // published version lookup (limit)
          [trn],  // translations for published version (where — no limit)
          [ver],  // all version rows (orderBy — no limit)
          [{ name: 'My Service', description: 'desc' }], // per-version enrichment (limit)
        );

        const service = buildService(mocks);
        const result = await service.findById(SERVICE_ID);

        expect(result.id).toBe(SERVICE_ID);
        expect(result.name).toBe('My Service');
        expect(result.description).toBe('A service description');
        expect(result.publishedVersion).toMatchObject({
          id: VERSION_ID,
          status: 'published',
          name: 'My Service',
          description: 'A service description',
          translations: [trn],
        });
        expect(result.versions).toHaveLength(1);
        expect(result.versions[0]).toMatchObject({ id: VERSION_ID, name: 'My Service' });
      });
    });

    describe('when service has no published version', () => {
      it('should return null publishedVersion and fall back to latest version name', async () => {
        const mocks = createDbMock();
        const svc = makeService({ publishedServiceVersionId: null });
        const ver = makeVersion({ id: VERSION_ID_2, version: 2, status: 'draft' });

        mocks.enqueueSelect(
          [svc],
          [ver],  // version list (orderBy)
          [{ name: 'Draft Name', description: 'draft desc' }], // per-version enrichment (limit)
          [{ name: 'Draft Name', description: 'draft desc' }], // fallback name query (limit)
        );

        const service = buildService(mocks);
        const result = await service.findById(SERVICE_ID);

        expect(result.publishedVersion).toBeNull();
        expect(result.name).toBe('Draft Name');
        expect(result.description).toBe('draft desc');
        expect(result.versions).toHaveLength(1);
      });

      it('should return null name when no versions exist', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect(
          [makeService({ publishedServiceVersionId: null })],
          [], // empty version list (orderBy)
        );

        const service = buildService(mocks);
        const result = await service.findById(SERVICE_ID);

        expect(result.publishedVersion).toBeNull();
        expect(result.name).toBeNull();
        expect(result.description).toBeNull();
        expect(result.versions).toHaveLength(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // createVersion
  // -------------------------------------------------------------------------

  describe('createVersion', () => {
    describe('when service does not exist', () => {
      it('should throw NotFoundException with the service id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(service.createVersion(SERVICE_ID)).rejects.toThrow(
          new NotFoundException(`Service ${SERVICE_ID} not found`),
        );
      });
    });

    describe('when no published type version exists', () => {
      it('should throw BadRequestException', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect(
          [makeService()],
          [], // no published type version
        );

        const service = buildService(mocks);

        await expect(service.createVersion(SERVICE_ID)).rejects.toThrow(
          new BadRequestException('No published type version available for this service type'),
        );
      });
    });

    describe('when previous versions exist with translations', () => {
      it('should create new draft version and copy all translations from previous version', async () => {
        const mocks = createDbMock();
        const prevTranslation = makeTranslation({ serviceVersionId: VERSION_ID });
        const newVersion = makeVersion({ id: VERSION_ID_2, version: 2 });

        mocks.enqueueSelect(
          [makeService()],
          [{ id: SERVICE_TYPE_VERSION_ID }],
          [{ id: VERSION_ID }],    // previous version lookup
          [prevTranslation],       // previous translations
        );
        mocks.enqueueInsert([newVersion], []); // new version + translation copy (void)

        const service = buildService(mocks);
        const result = await service.createVersion(SERVICE_ID);

        expect(result).toMatchObject({ id: VERSION_ID_2, version: 2, status: 'draft' });
        expect(mocks.insertMock).toHaveBeenCalledTimes(2);
        expect(mocks.insertValues).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              serviceVersionId: VERSION_ID_2,
              locale: 'en',
              name: 'My Service',
            }),
          ]),
        );
      });

      it('should not insert translations when previous version has none', async () => {
        const mocks = createDbMock();
        const newVersion = makeVersion({ id: VERSION_ID_2, version: 2 });

        mocks.enqueueSelect(
          [makeService()],
          [{ id: SERVICE_TYPE_VERSION_ID }],
          [{ id: VERSION_ID }],
          [], // no translations on previous version
        );
        mocks.enqueueInsert([newVersion]);

        const service = buildService(mocks);
        const result = await service.createVersion(SERVICE_ID);

        expect(result).toMatchObject({ id: VERSION_ID_2 });
        expect(mocks.insertMock).toHaveBeenCalledTimes(1);
        expect(mocks.insertMock).toHaveBeenCalledWith(schema.serviceVersions);
      });
    });

    describe('when no previous versions exist', () => {
      it('should create first version without copying any translations', async () => {
        const mocks = createDbMock();
        const newVersion = makeVersion({ id: VERSION_ID_2, version: 1 });

        mocks.enqueueSelect(
          [makeService()],
          [{ id: SERVICE_TYPE_VERSION_ID }],
          [], // no previous versions
        );
        mocks.enqueueInsert([newVersion]);

        const service = buildService(mocks);
        const result = await service.createVersion(SERVICE_ID);

        expect(result).toMatchObject({ id: VERSION_ID_2, status: 'draft' });
        expect(mocks.insertMock).toHaveBeenCalledTimes(1);
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

        await expect(service.getVersion(SERVICE_ID, VERSION_ID)).rejects.toThrow(
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
        const result = await service.getVersion(SERVICE_ID, VERSION_ID);

        expect(result).toMatchObject({
          id: VERSION_ID,
          status: 'published',
          name: 'My Service',
          description: 'A service description',
          translations: [trn],
        });
      });

      it('should use the first translation for name when multiple exist', async () => {
        const mocks = createDbMock();
        const ver = makeVersion();
        const enTrn = makeTranslation({ locale: 'en', name: 'First Translation' });
        const frTrn = makeTranslation({ locale: 'fr', name: 'Deuxième traduction' });

        mocks.enqueueSelect([ver], [enTrn, frTrn]);

        const service = buildService(mocks);
        const result = await service.getVersion(SERVICE_ID, VERSION_ID);

        expect(result.name).toBe('First Translation');
        expect(result.translations).toHaveLength(2);
      });
    });

    describe('when version has no translations', () => {
      it('should return null name and description with empty translations array', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([makeVersion()], []);

        const service = buildService(mocks);
        const result = await service.getVersion(SERVICE_ID, VERSION_ID);

        expect(result.name).toBeNull();
        expect(result.description).toBeNull();
        expect(result.translations).toHaveLength(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // upsertTranslation
  // -------------------------------------------------------------------------

  describe('upsertTranslation', () => {
    describe('when version does not exist', () => {
      it('should throw NotFoundException', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(
          service.upsertTranslation(SERVICE_ID, VERSION_ID, 'en', {
            name: 'My Service',
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
          service.upsertTranslation(SERVICE_ID, VERSION_ID, 'en', {
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
          service.upsertTranslation(SERVICE_ID, VERSION_ID, 'fr', {
            name: 'Nom du service',
            content: {},
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when version is draft', () => {
      it('should upsert translation and return the result', async () => {
        const mocks = createDbMock();
        const updatedTrn = makeTranslation({ locale: 'fr', name: 'Mon Service' });

        mocks.enqueueSelect([makeVersion({ status: 'draft' })]);
        mocks.enqueueOnConflict([updatedTrn]);

        const service = buildService(mocks);
        const result = await service.upsertTranslation(SERVICE_ID, VERSION_ID, 'fr', {
          name: 'Mon Service',
          description: 'Description française',
          content: { lang: 'fr' },
        });

        expect(result).toMatchObject({ name: 'Mon Service', locale: 'fr' });
        expect(mocks.insertMock).toHaveBeenCalledWith(schema.serviceVersionTranslations);
        expect(mocks.insertOnConflictDoUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            set: expect.objectContaining({ name: 'Mon Service' }),
          }),
        );
      });

      it('should default description to null when not provided', async () => {
        const mocks = createDbMock();
        const trn = makeTranslation({ description: null });

        mocks.enqueueSelect([makeVersion({ status: 'draft' })]);
        mocks.enqueueOnConflict([trn]);

        const service = buildService(mocks);
        await service.upsertTranslation(SERVICE_ID, VERSION_ID, 'en', {
          name: 'My Service',
          content: { a: 1 },
        });

        expect(mocks.insertValues).toHaveBeenCalledWith(
          expect.objectContaining({ description: null, locale: 'en' }),
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

        await expect(service.publishVersion(SERVICE_ID, VERSION_ID)).rejects.toThrow(
          new NotFoundException(`Version ${VERSION_ID} not found`),
        );
      });
    });

    describe('when version is not draft', () => {
      it('should throw BadRequestException for a published version', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect([makeVersion({ status: 'published' })]);

        const service = buildService(mocks);

        await expect(service.publishVersion(SERVICE_ID, VERSION_ID)).rejects.toThrow(
          new BadRequestException('Only draft versions can be published'),
        );
      });

      it('should throw BadRequestException for an archived version', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect([makeVersion({ status: 'archived' })]);

        const service = buildService(mocks);

        await expect(service.publishVersion(SERVICE_ID, VERSION_ID)).rejects.toThrow(
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

        await expect(service.publishVersion(SERVICE_ID, VERSION_ID)).rejects.toThrow(
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
          [makeService({ publishedServiceVersionId: VERSION_ID_2 })],
        );
        // 3 updates: archive old (where direct), publish new (returning), update service FK (where direct)
        mocks.enqueueTxUpdate([], [publishedResult], []);

        const service = buildService(mocks);
        const result = await service.publishVersion(SERVICE_ID, VERSION_ID);

        expect(result).toMatchObject({ status: 'published' });
        expect(mocks.tx.update).toHaveBeenCalledTimes(3);
        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'archived' }),
        );
        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'published' }),
        );
        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ publishedServiceVersionId: VERSION_ID }),
        );
      });
    });

    describe('when no version is currently published on the service', () => {
      it('should publish without archiving any prior version', async () => {
        const mocks = createDbMock();
        const publishedResult = makeVersion({ status: 'published', publishedAt: NOW });

        mocks.enqueueTxSelect(
          [makeVersion({ status: 'draft' })],
          [{ id: TRANSLATION_ID }],
          [makeService({ publishedServiceVersionId: null })],
        );
        // 2 updates: publish new (returning), update service FK (where direct)
        mocks.enqueueTxUpdate([publishedResult], []);

        const service = buildService(mocks);
        const result = await service.publishVersion(SERVICE_ID, VERSION_ID);

        expect(result).toMatchObject({ status: 'published' });
        expect(mocks.tx.update).toHaveBeenCalledTimes(2);
        expect(mocks.tx.updateSet).not.toHaveBeenCalledWith(
          expect.objectContaining({ status: 'archived' }),
        );
      });

      it('should not archive when publishedServiceVersionId matches the version being published', async () => {
        const mocks = createDbMock();
        const publishedResult = makeVersion({ status: 'published', publishedAt: NOW });

        mocks.enqueueTxSelect(
          [makeVersion({ status: 'draft' })],
          [{ id: TRANSLATION_ID }],
          [makeService({ publishedServiceVersionId: VERSION_ID })], // same id
        );
        mocks.enqueueTxUpdate([publishedResult], []);

        const service = buildService(mocks);
        await service.publishVersion(SERVICE_ID, VERSION_ID);

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

        await expect(service.archiveVersion(SERVICE_ID, VERSION_ID)).rejects.toThrow(
          new NotFoundException(`Version ${VERSION_ID} not found`),
        );
      });
    });

    describe('when version is not published', () => {
      it('should throw BadRequestException for a draft version', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect([makeVersion({ status: 'draft' })]);

        const service = buildService(mocks);

        await expect(service.archiveVersion(SERVICE_ID, VERSION_ID)).rejects.toThrow(
          new BadRequestException('Only published versions can be archived'),
        );
      });

      it('should throw BadRequestException for an already-archived version', async () => {
        const mocks = createDbMock();
        mocks.enqueueTxSelect([makeVersion({ status: 'archived' })]);

        const service = buildService(mocks);

        await expect(service.archiveVersion(SERVICE_ID, VERSION_ID)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('when version is published', () => {
      it('should archive version and null out service publishedServiceVersionId', async () => {
        const mocks = createDbMock();
        const archived = makeVersion({ status: 'archived', archivedAt: NOW });

        mocks.enqueueTxSelect([makeVersion({ status: 'published' })]);
        // 2 updates: archive (returning), null FK (where direct)
        mocks.enqueueTxUpdate([archived], []);

        const service = buildService(mocks);
        const result = await service.archiveVersion(SERVICE_ID, VERSION_ID);

        expect(result).toMatchObject({ status: 'archived' });
        expect(mocks.tx.update).toHaveBeenCalledTimes(2);
        expect(mocks.tx.update).toHaveBeenCalledWith(schema.serviceVersions);
        expect(mocks.tx.update).toHaveBeenCalledWith(schema.services);
        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'archived' }),
        );
        expect(mocks.tx.updateSet).toHaveBeenCalledWith(
          expect.objectContaining({ publishedServiceVersionId: null }),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // findAllPublished
  // -------------------------------------------------------------------------

  describe('findAllPublished', () => {
    describe('when no services are found', () => {
      it('should return empty data without querying translations', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 0 }]);

        const service = buildService(mocks);
        const result = await service.findAllPublished(1, 10, 'en', {});

        expect(result).toEqual({ data: [], total: 0, totalPages: 0, page: 1, limit: 10 });
        expect(mocks.db.select).toHaveBeenCalledTimes(2);
      });
    });

    describe('with matching locale translation', () => {
      it('should return FlatService array with all required fields', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          publishedAt: NOW,
        };
        const trn = makeTranslation({ locale: 'fr', name: 'Mon Service' });

        mocks.enqueueSelect([row], [{ count: 1 }], [trn]);

        const service = buildService(mocks);
        const result = await service.findAllPublished(1, 10, 'fr', {});

        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual({
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          versionId: VERSION_ID,
          publishedAt: NOW.toISOString(),
          locale: 'fr',
          name: 'Mon Service',
          description: 'A service description',
          content: { key: 'value' },
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        });
      });
    });

    describe('locale fallback', () => {
      it('should fall back to English when only English translation exists', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          publishedAt: NOW,
        };

        mocks.enqueueSelect(
          [row],
          [{ count: 1 }],
          [makeTranslation({ locale: 'en', name: 'English Only' })],
        );

        const service = buildService(mocks);
        const result = await service.findAllPublished(1, 10, 'fr', {});

        expect(result.data).toHaveLength(1);
        expect(result.data[0].locale).toBe('en');
        expect(result.data[0].name).toBe('English Only');
      });

      it('should prefer requested locale over English fallback when both exist', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          publishedAt: NOW,
        };
        const frTrn = makeTranslation({ locale: 'fr', name: 'Service Français' });
        const enTrn = makeTranslation({ locale: 'en', name: 'English Service' });

        mocks.enqueueSelect([row], [{ count: 1 }], [frTrn, enTrn]);

        const service = buildService(mocks);
        const result = await service.findAllPublished(1, 10, 'fr', {});

        expect(result.data[0].locale).toBe('fr');
        expect(result.data[0].name).toBe('Service Français');
      });

      it('should skip rows where publishedAt is null', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          publishedAt: null,
        };

        mocks.enqueueSelect([row], [{ count: 1 }], [makeTranslation()]);

        const service = buildService(mocks);
        const result = await service.findAllPublished(1, 10, 'en', {});

        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(1);
      });

      it('should skip rows with no matching translation', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          publishedAt: NOW,
        };

        mocks.enqueueSelect([row], [{ count: 1 }], []);

        const service = buildService(mocks);
        const result = await service.findAllPublished(1, 10, 'en', {});

        expect(result.data).toHaveLength(0);
      });
    });

    describe('with filters', () => {
      it('should apply serviceTypeId filter', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 0 }]);

        const service = buildService(mocks);
        const result = await service.findAllPublished(1, 10, 'en', {
          serviceTypeId: SERVICE_TYPE_ID,
        });

        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it('should apply orgUnitId filter', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 0 }]);

        const service = buildService(mocks);
        const result = await service.findAllPublished(1, 10, 'en', {
          orgUnitId: ORG_UNIT_ID,
        });

        expect(result.data).toHaveLength(0);
      });

      it('should apply search filter', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 0 }]);

        const service = buildService(mocks);
        const result = await service.findAllPublished(1, 10, 'en', {
          search: 'healthcare',
        });

        expect(result.data).toHaveLength(0);
      });
    });

    describe('pagination', () => {
      it('should calculate correct totalPages using ceiling division', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([], [{ count: 23 }]);

        const service = buildService(mocks);
        const result = await service.findAllPublished(2, 10, 'en', {});

        expect(result.totalPages).toBe(3); // ceil(23/10)=3
        expect(result.page).toBe(2);
        expect(result.limit).toBe(10);
      });
    });
  });

  // -------------------------------------------------------------------------
  // findOnePublished
  // -------------------------------------------------------------------------

  describe('findOnePublished', () => {
    describe('when service does not exist or has no published version', () => {
      it('should throw NotFoundException with the service id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(service.findOnePublished(SERVICE_ID, 'en')).rejects.toThrow(
          new NotFoundException(`Service ${SERVICE_ID} not found`),
        );
      });
    });

    describe('when translation cannot be resolved', () => {
      it('should throw NotFoundException when no translation exists for locale or fallback', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          publishedAt: NOW,
        };

        mocks.enqueueSelect(
          [row],
          [], // resolveTranslation returns nothing
        );

        const service = buildService(mocks);

        await expect(service.findOnePublished(SERVICE_ID, 'ja')).rejects.toThrow(
          new NotFoundException(`Service ${SERVICE_ID} not found`),
        );
      });

      it('should throw NotFoundException when publishedAt is null on the joined row', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          publishedAt: null,
        };

        mocks.enqueueSelect([row], [makeTranslation()]);

        const service = buildService(mocks);

        await expect(service.findOnePublished(SERVICE_ID, 'en')).rejects.toThrow(NotFoundException);
      });
    });

    describe('when service is fully published with translation', () => {
      it('should return a correctly-shaped FlatService', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          publishedAt: NOW,
        };

        mocks.enqueueSelect([row], [makeTranslation()]);

        const service = buildService(mocks);
        const result = await service.findOnePublished(SERVICE_ID, 'en');

        expect(result).toEqual({
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          versionId: VERSION_ID,
          publishedAt: NOW.toISOString(),
          locale: 'en',
          name: 'My Service',
          description: 'A service description',
          content: { key: 'value' },
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        });
      });

      it('should prefer the requested locale over English fallback', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          publishedAt: NOW,
        };
        const frTrn = makeTranslation({ locale: 'fr', name: 'Service Français' });
        const enTrn = makeTranslation({ locale: 'en', name: 'English Service' });

        mocks.enqueueSelect([row], [frTrn, enTrn]);

        const service = buildService(mocks);
        const result = await service.findOnePublished(SERVICE_ID, 'fr');

        expect(result.locale).toBe('fr');
        expect(result.name).toBe('Service Français');
      });
    });
  });

  // -------------------------------------------------------------------------
  // findOneVersion
  // -------------------------------------------------------------------------

  describe('findOneVersion', () => {
    describe('when version does not exist or is draft', () => {
      it('should throw NotFoundException with the version id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(service.findOneVersion(SERVICE_ID, VERSION_ID, 'en')).rejects.toThrow(
          new NotFoundException(`Version ${VERSION_ID} not found`),
        );
      });
    });

    describe('when version exists but has no translation', () => {
      it('should throw NotFoundException when resolveTranslation returns null', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          versionStatus: 'published',
          publishedAt: NOW,
        };

        mocks.enqueueSelect([row], []);

        const service = buildService(mocks);

        await expect(service.findOneVersion(SERVICE_ID, VERSION_ID, 'en')).rejects.toThrow(
          new NotFoundException(`Version ${VERSION_ID} not found`),
        );
      });

      it('should throw NotFoundException when publishedAt is null', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          versionStatus: 'archived',
          publishedAt: null,
        };

        mocks.enqueueSelect([row], [makeTranslation()]);

        const service = buildService(mocks);

        await expect(service.findOneVersion(SERVICE_ID, VERSION_ID, 'en')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('when a published version exists with translation', () => {
      it('should return a correctly-shaped FlatService', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          versionStatus: 'published',
          publishedAt: NOW,
        };

        mocks.enqueueSelect([row], [makeTranslation()]);

        const service = buildService(mocks);
        const result = await service.findOneVersion(SERVICE_ID, VERSION_ID, 'en');

        expect(result).toMatchObject({
          id: SERVICE_ID,
          versionId: VERSION_ID,
          locale: 'en',
          name: 'My Service',
          publishedAt: NOW.toISOString(),
          createdAt: NOW.toISOString(),
        });
      });
    });

    describe('when an archived version exists with translation', () => {
      it('should return a FlatService for the archived version', async () => {
        const mocks = createDbMock();
        const row = {
          id: SERVICE_ID,
          serviceTypeId: SERVICE_TYPE_ID,
          orgUnitId: ORG_UNIT_ID,
          createdAt: NOW,
          updatedAt: NOW,
          versionId: VERSION_ID,
          versionStatus: 'archived',
          publishedAt: NOW,
        };

        mocks.enqueueSelect([row], [makeTranslation()]);

        const service = buildService(mocks);
        const result = await service.findOneVersion(SERVICE_ID, VERSION_ID, 'en');

        expect(result).toMatchObject({ id: SERVICE_ID, versionId: VERSION_ID });
      });
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  describe('delete', () => {
    describe('when service does not exist', () => {
      it('should throw NotFoundException with the service id', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        await expect(service.delete(SERVICE_ID)).rejects.toThrow(
          new NotFoundException(`Service ${SERVICE_ID} not found`),
        );
      });

      it('should not call update or delete when service is not found', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([]);

        const service = buildService(mocks);

        try {
          await service.delete(SERVICE_ID);
        } catch {
          // expected
        }

        expect(mocks.updateMock).not.toHaveBeenCalled();
        expect(mocks.deleteMock).not.toHaveBeenCalled();
      });
    });

    describe('when service exists', () => {
      it('should null the publishedServiceVersionId FK before deleting', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([{ id: SERVICE_ID }]);
        mocks.enqueueUpdate([]); // FK null update (void)
        mocks.enqueueDelete([]);

        const service = buildService(mocks);
        await service.delete(SERVICE_ID);

        expect(mocks.updateMock).toHaveBeenCalledWith(schema.services);
        expect(mocks.updateSet).toHaveBeenCalledWith({ publishedServiceVersionId: null });
        expect(mocks.deleteMock).toHaveBeenCalledWith(schema.services);
      });

      it('should propagate error from FK null update and not proceed to delete', async () => {
        const mocks = createDbMock();
        mocks.enqueueSelect([{ id: SERVICE_ID }]);
        mocks.updateWhere.mockRejectedValueOnce(new Error('FK constraint error'));

        const service = buildService(mocks);

        await expect(service.delete(SERVICE_ID)).rejects.toThrow('FK constraint error');
        expect(mocks.deleteMock).not.toHaveBeenCalled();
      });
    });
  });
});
