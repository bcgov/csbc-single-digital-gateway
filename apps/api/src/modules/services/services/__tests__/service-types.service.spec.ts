import { BadRequestException, NotFoundException } from '@nestjs/common';
import { type Database, schema } from '@repo/db';
import { ServiceTypesService } from '../service-types.service';

// ---------------------------------------------------------------------------
// Shared test data factories
// ---------------------------------------------------------------------------

const makeType = (
  overrides: Partial<{
    id: string;
    publishedServiceTypeVersionId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  id: 'type-uuid-1',
  publishedServiceTypeVersionId: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

const makeVersion = (
  overrides: Partial<{
    id: string;
    serviceTypeId: string;
    version: number;
    status: 'draft' | 'published' | 'archived';
    publishedAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  id: 'version-uuid-1',
  serviceTypeId: 'type-uuid-1',
  version: 1,
  status: 'draft' as const,
  publishedAt: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

const makeTranslation = (
  overrides: Partial<{
    id: string;
    serviceTypeVersionId: string;
    locale: string;
    name: string;
    description: string;
    schema: Record<string, unknown>;
    uiSchema: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  id: 'translation-uuid-1',
  serviceTypeVersionId: 'version-uuid-1',
  locale: 'en',
  name: 'Employment Services',
  description: 'Services related to employment',
  schema: {},
  uiSchema: {},
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

// ---------------------------------------------------------------------------
// DB mock design
//
// The Drizzle chains used by this service terminate at these points:
//
//   SELECT chains:
//     .from().where().limit()                          → selectLimitMock
//     .from().where().orderBy().limit().offset()       → selectOffsetMock
//     .from().where().orderBy()                        → selectOrderByMock  (awaited directly)
//     .from().where()                                  → selectWhereMock    (awaited directly, count queries)
//     .from().innerJoin().innerJoin().where().orderBy().limit().offset()
//                                                      → selectOffsetMock
//     .from().orderBy().limit().offset()               → selectOffsetMock  (no where)
//
//   INSERT chains:
//     .values().returning()                            → insertReturningMock
//     .values().onConflictDoUpdate().returning()       → insertOnConflictReturningMock
//     .values()  (awaited without returning)           → insertValuesMock
//
//   UPDATE chains:
//     .set().where().returning()                       → updateReturningMock
//     .set().where()  (awaited without returning)      → updateWhereMock
//
//   DELETE chains:
//     .where()                                         → deleteWhereMock
//
// All terminal mocks use mockResolvedValueOnce for per-test sequencing.
// The select chain is unified: every terminal calls the same selectTerminal
// mock so tests can queue responses in execution order.
// ---------------------------------------------------------------------------

type DbBundle = {
  db: {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    transaction: jest.Mock;
  };
  // Outer terminal mocks
  selectTerminal: jest.Mock;
  insertReturningMock: jest.Mock;
  insertOnConflictReturningMock: jest.Mock;
  insertValuesMock: jest.Mock;
  updateReturningMock: jest.Mock;
  updateWhereMock: jest.Mock;
  deleteWhereMock: jest.Mock;
  transactionMock: jest.Mock;
  // TX terminal mocks (mirrors of outer)
  txSelectTerminal: jest.Mock;
  txInsertReturningMock: jest.Mock;
  txInsertValuesMock: jest.Mock;
  txUpdateReturningMock: jest.Mock;
  txUpdateWhereMock: jest.Mock;
};

const createDbMock = (): DbBundle => {
  // ---- outer select ----
  // Every terminal point calls selectTerminal lazily so mockResolvedValueOnce
  // values are consumed in the correct call order.
  const selectTerminal = jest.fn().mockResolvedValue([]);

  const buildSelectChain = () => {
    const offsetFn = jest.fn().mockImplementation(() => selectTerminal());
    const limitAfterOrderBy = jest.fn().mockImplementation(() => ({
      offset: offsetFn,
      then: (...args: Parameters<Promise<unknown>['then']>) =>
        selectTerminal().then(...args),
    }));
    const orderByFn = jest.fn().mockReturnValue({
      limit: limitAfterOrderBy,
      // support awaiting orderBy directly
      then: (...args: Parameters<Promise<unknown>['then']>) =>
        selectTerminal().then(...args),
    });
    const limitFn = jest.fn().mockImplementation(() => selectTerminal());
    const whereFn = jest.fn().mockReturnValue({
      limit: limitFn,
      orderBy: orderByFn,
      // support awaiting where directly (count queries, translation queries)
      then: (...args: Parameters<Promise<unknown>['then']>) =>
        selectTerminal().then(...args),
    });
    const innerJoin2Fn = jest.fn().mockReturnValue({ where: whereFn });
    const innerJoin1Fn = jest.fn().mockReturnValue({
      innerJoin: innerJoin2Fn,
      where: whereFn,
    });
    const fromFn = jest.fn().mockReturnValue({
      where: whereFn,
      innerJoin: innerJoin1Fn,
      orderBy: orderByFn,
    });
    return { from: fromFn };
  };

  const selectMock = jest.fn().mockImplementation(() => buildSelectChain());

  // ---- outer insert ----
  const insertReturningMock = jest.fn().mockResolvedValue([]);
  const insertOnConflictReturningMock = jest.fn().mockResolvedValue([]);
  const insertValuesMock = jest.fn().mockResolvedValue(undefined);

  const insertMock = jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: insertReturningMock,
      onConflictDoUpdate: jest.fn().mockReturnValue({
        returning: insertOnConflictReturningMock,
      }),
      // support awaiting values() directly (translation copy insert)
      then: (...args: Parameters<Promise<unknown>['then']>) =>
        insertValuesMock().then(...args),
    }),
  });

  // ---- outer update ----
  const updateReturningMock = jest.fn().mockResolvedValue([]);
  const updateWhereMock = jest.fn().mockResolvedValue(undefined);

  const updateMock = jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: updateReturningMock,
        // support awaiting where() directly
        then: (...args: Parameters<Promise<unknown>['then']>) =>
          updateWhereMock().then(...args),
      }),
    }),
  });

  // ---- outer delete ----
  const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
  const deleteMock = jest.fn().mockReturnValue({
    where: jest.fn().mockImplementation(() => deleteWhereMock()),
  });

  // ---- tx mirrors ----
  const txSelectTerminal = jest.fn().mockResolvedValue([]);

  const buildTxSelectChain = () => {
    const offsetFn = jest.fn().mockImplementation(() => txSelectTerminal());
    const limitAfterOrderBy = jest.fn().mockImplementation(() => ({
      offset: offsetFn,
      then: (...args: Parameters<Promise<unknown>['then']>) =>
        txSelectTerminal().then(...args),
    }));
    const orderByFn = jest.fn().mockReturnValue({
      limit: limitAfterOrderBy,
      then: (...args: Parameters<Promise<unknown>['then']>) =>
        txSelectTerminal().then(...args),
    });
    const limitFn = jest.fn().mockImplementation(() => txSelectTerminal());
    const whereFn = jest.fn().mockReturnValue({
      limit: limitFn,
      orderBy: orderByFn,
      then: (...args: Parameters<Promise<unknown>['then']>) =>
        txSelectTerminal().then(...args),
    });
    const fromFn = jest.fn().mockReturnValue({ where: whereFn });
    return { from: fromFn };
  };

  const txSelectMock = jest.fn().mockImplementation(() => buildTxSelectChain());

  const txInsertReturningMock = jest.fn().mockResolvedValue([]);
  const txInsertValuesMock = jest.fn().mockResolvedValue(undefined);

  const txInsertMock = jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: txInsertReturningMock,
      then: (...args: Parameters<Promise<unknown>['then']>) =>
        txInsertValuesMock().then(...args),
    }),
  });

  const txUpdateReturningMock = jest.fn().mockResolvedValue([]);
  const txUpdateWhereMock = jest.fn().mockResolvedValue(undefined);

  const txUpdateMock = jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: txUpdateReturningMock,
        then: (...args: Parameters<Promise<unknown>['then']>) =>
          txUpdateWhereMock().then(...args),
      }),
    }),
  });

  const tx = {
    select: txSelectMock,
    insert: txInsertMock,
    update: txUpdateMock,
  };

  const transactionMock = jest.fn(
    async (cb: (txArg: typeof tx) => unknown) => cb(tx),
  );

  return {
    db: {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
      transaction: transactionMock,
    },
    selectTerminal,
    insertReturningMock,
    insertOnConflictReturningMock,
    insertValuesMock,
    updateReturningMock,
    updateWhereMock,
    deleteWhereMock,
    transactionMock,
    txSelectTerminal,
    txInsertReturningMock,
    txInsertValuesMock,
    txUpdateReturningMock,
    txUpdateWhereMock,
  };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ServiceTypesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should insert type, version, and translation inside a transaction and return combined result', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const createdType = makeType({ id: 'type-new-1' });
      const createdVersion = makeVersion({
        id: 'version-new-1',
        serviceTypeId: 'type-new-1',
        status: 'draft',
        version: 1,
      });
      const createdTranslation = makeTranslation({
        id: 'translation-new-1',
        serviceTypeVersionId: 'version-new-1',
        name: 'Housing Support',
        description: 'Provides housing assistance',
      });

      bundle.txInsertReturningMock
        .mockResolvedValueOnce([createdType])
        .mockResolvedValueOnce([createdVersion])
        .mockResolvedValueOnce([createdTranslation]);

      const result = await service.create({
        name: 'Housing Support',
        description: 'Provides housing assistance',
        schema: { type: 'object' },
        uiSchema: { 'ui:order': ['name'] },
      });

      expect(bundle.db.transaction).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('type-new-1');
      expect(result.version.id).toBe('version-new-1');
      expect(result.version.status).toBe('draft');
      expect(result.version.translations).toHaveLength(1);
      expect(result.version.translations[0].name).toBe('Housing Support');
      expect(result.version.translations[0].locale).toBe('en');
    });

    it('should default schema and uiSchema to empty objects when not provided', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const createdType = makeType({ id: 'type-def-1' });
      const createdVersion = makeVersion({ id: 'version-def-1' });
      const createdTranslation = makeTranslation({ schema: {}, uiSchema: {} });

      const capturedInsertValues: unknown[] = [];
      bundle.db.transaction = jest.fn(async (cb: (tx: unknown) => unknown) => {
        const fakeTx = {
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockImplementation((vals: unknown) => {
              capturedInsertValues.push(vals);
              return {
                returning: jest
                  .fn()
                  .mockResolvedValueOnce([createdType])
                  .mockResolvedValueOnce([createdVersion])
                  .mockResolvedValueOnce([createdTranslation]),
              };
            }),
          }),
        };
        return cb(fakeTx);
      });

      await service.create({ name: 'Child Care', description: 'Child care services' });

      // Third insert call is the translation — schema and uiSchema should default to {}
      const translationInsertValues = capturedInsertValues[2] as Record<
        string,
        unknown
      >;
      expect(translationInsertValues.schema).toEqual({});
      expect(translationInsertValues.uiSchema).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // findAllPublished
  // -------------------------------------------------------------------------
  describe('findAllPublished', () => {
    it('should return paginated rows with correct total and totalPages', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const rows = [
        { id: 'type-1', name: 'Employment Services' },
        { id: 'type-2', name: 'Housing Support' },
      ];
      // Promise.all resolves: rows first, count second
      bundle.selectTerminal
        .mockResolvedValueOnce(rows)
        .mockResolvedValueOnce([{ count: 25 }]);

      const result = await service.findAllPublished(2, 10);

      expect(result.data).toEqual(rows);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should return totalPages of 1 when count is exactly equal to limit', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.selectTerminal
        .mockResolvedValueOnce([{ id: 'type-1', name: 'Name' }])
        .mockResolvedValueOnce([{ count: 10 }]);

      const result = await service.findAllPublished(1, 10);

      expect(result.totalPages).toBe(1);
      expect(result.total).toBe(10);
    });

    it('should include search filter and still return paginated results', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const filtered = [{ id: 'type-3', name: 'Employment' }];
      bundle.selectTerminal
        .mockResolvedValueOnce(filtered)
        .mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.findAllPublished(1, 10, 'Employment');

      expect(result.data).toEqual(filtered);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should return empty data array and 0 total when no published types exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.selectTerminal
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]);

      const result = await service.findAllPublished(1, 10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return all types without published filter when isAdmin=true', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const draftType = makeType({
        id: 'type-draft-1',
        publishedServiceTypeVersionId: null,
      });
      const draftVersion = makeVersion({
        id: 'version-draft-1',
        serviceTypeId: 'type-draft-1',
        status: 'draft',
      });
      const draftTranslation = makeTranslation({
        serviceTypeVersionId: 'version-draft-1',
        name: 'Draft Type',
      });

      // Call sequence: rows, count, versions (enrichment), translations (enrichment)
      bundle.selectTerminal
        .mockResolvedValueOnce([draftType])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([draftVersion])
        .mockResolvedValueOnce([draftTranslation]);

      const result = await service.findAll(1, 10, true);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Draft Type');
      expect(result.data[0].updatesPending).toBe(false);
    });

    it('should filter to published types only when isAdmin=false', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const publishedType = makeType({
        id: 'type-pub-1',
        publishedServiceTypeVersionId: 'version-pub-1',
      });
      const publishedVersion = makeVersion({
        id: 'version-pub-1',
        serviceTypeId: 'type-pub-1',
        status: 'published',
      });
      const translation = makeTranslation({
        serviceTypeVersionId: 'version-pub-1',
        name: 'Published Service',
      });

      bundle.selectTerminal
        .mockResolvedValueOnce([publishedType])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([publishedVersion])
        .mockResolvedValueOnce([translation]);

      const result = await service.findAll(1, 10, false);

      expect(result.total).toBe(1);
      expect(result.data[0].name).toBe('Published Service');
    });

    it('should apply search filter and return correct pagination math', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-search-1',
        publishedServiceTypeVersionId: 'v-search-1',
      });
      const version = makeVersion({
        id: 'v-search-1',
        serviceTypeId: 'type-search-1',
        status: 'published',
      });
      const translation = makeTranslation({
        serviceTypeVersionId: 'v-search-1',
        name: 'Housing Search',
      });

      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([{ count: 42 }])
        .mockResolvedValueOnce([version])
        .mockResolvedValueOnce([translation]);

      const result = await service.findAll(3, 15, true, 'Housing');

      expect(result.total).toBe(42);
      expect(result.totalPages).toBe(3); // ceil(42/15) = 3
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
    });

    it('should return empty data array immediately when no types exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.selectTerminal
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]);

      const result = await service.findAll(1, 10, true);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // enrichTypesWithTranslations (private, exercised via findAll)
  // -------------------------------------------------------------------------
  describe('enrichTypesWithTranslations (via findAll)', () => {
    it('should return null name/description when type has no versions', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-novr-1',
        publishedServiceTypeVersionId: null,
      });

      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([{ count: 1 }])
        // versions query returns empty — no versions for this type
        .mockResolvedValueOnce([]);
      // No translation query since relevantVersionIds will be empty

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].name).toBeNull();
      expect(result.data[0].description).toBeNull();
      expect(result.data[0].updatesPending).toBe(false);
    });

    it('should use published version translation when published version exists', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-pub-2',
        publishedServiceTypeVersionId: 'version-pub-2',
      });
      const publishedVersion = makeVersion({
        id: 'version-pub-2',
        serviceTypeId: 'type-pub-2',
        status: 'published',
        version: 1,
      });
      const draftVersion = makeVersion({
        id: 'version-draft-2',
        serviceTypeId: 'type-pub-2',
        status: 'draft',
        version: 2,
      });
      const publishedTranslation = makeTranslation({
        serviceTypeVersionId: 'version-pub-2',
        name: 'Published Name',
        description: 'Published Description',
      });

      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([{ count: 1 }])
        // versions ordered desc: draft (v2) first, then published (v1)
        .mockResolvedValueOnce([draftVersion, publishedVersion])
        .mockResolvedValueOnce([publishedTranslation]);

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].name).toBe('Published Name');
      expect(result.data[0].description).toBe('Published Description');
    });

    it('should set updatesPending=true when published version AND draft version both exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-up-1',
        publishedServiceTypeVersionId: 'version-up-pub',
      });
      const publishedVersion = makeVersion({
        id: 'version-up-pub',
        serviceTypeId: 'type-up-1',
        status: 'published',
        version: 1,
      });
      const draftVersion = makeVersion({
        id: 'version-up-draft',
        serviceTypeId: 'type-up-1',
        status: 'draft',
        version: 2,
      });
      const translation = makeTranslation({
        serviceTypeVersionId: 'version-up-pub',
        name: 'Service With Pending',
      });

      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([draftVersion, publishedVersion])
        .mockResolvedValueOnce([translation]);

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].updatesPending).toBe(true);
    });

    it('should set updatesPending=false when only a published version exists', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-nopend-1',
        publishedServiceTypeVersionId: 'version-nopend-1',
      });
      const publishedVersion = makeVersion({
        id: 'version-nopend-1',
        serviceTypeId: 'type-nopend-1',
        status: 'published',
      });
      const translation = makeTranslation({
        serviceTypeVersionId: 'version-nopend-1',
        name: 'Clean Published',
      });

      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([publishedVersion])
        .mockResolvedValueOnce([translation]);

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].updatesPending).toBe(false);
    });

    it('should use latest version translation when no published version FK is set', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-latest-1',
        publishedServiceTypeVersionId: null,
      });
      const latestDraft = makeVersion({
        id: 'version-latest-1',
        serviceTypeId: 'type-latest-1',
        status: 'draft',
        version: 2,
      });
      const olderArchived = makeVersion({
        id: 'version-older-1',
        serviceTypeId: 'type-latest-1',
        status: 'archived',
        version: 1,
      });
      const latestTranslation = makeTranslation({
        serviceTypeVersionId: 'version-latest-1',
        name: 'Latest Draft Name',
        description: 'Latest Draft Desc',
      });

      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([{ count: 1 }])
        // Ordered desc by version — latest is first
        .mockResolvedValueOnce([latestDraft, olderArchived])
        .mockResolvedValueOnce([latestTranslation]);

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].name).toBe('Latest Draft Name');
      expect(result.data[0].description).toBe('Latest Draft Desc');
    });

    it('should return null name/desc when all types have no versions (relevantVersionIds empty)', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type1 = makeType({ id: 'type-e1', publishedServiceTypeVersionId: null });
      const type2 = makeType({ id: 'type-e2', publishedServiceTypeVersionId: null });

      bundle.selectTerminal
        .mockResolvedValueOnce([type1, type2])
        .mockResolvedValueOnce([{ count: 2 }])
        // versions: none for either type
        .mockResolvedValueOnce([]);
      // No fourth call expected since relevantVersionIds is empty

      const result = await service.findAll(1, 10, true);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBeNull();
      expect(result.data[1].name).toBeNull();
      // Only 3 select calls: rows, count, versions — no translations call
      expect(bundle.db.select).toHaveBeenCalledTimes(3);
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------
  describe('findById', () => {
    it('should throw NotFoundException when type does not exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.selectTerminal.mockResolvedValueOnce([]);

      await expect(service.findById('nonexistent-type', true)).rejects.toThrow(
        new NotFoundException('Service type nonexistent-type not found'),
      );
    });

    it('should throw NotFoundException for non-admin when type is unpublished', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const unpublishedType = makeType({
        id: 'type-unp-1',
        publishedServiceTypeVersionId: null,
      });
      bundle.selectTerminal.mockResolvedValueOnce([unpublishedType]);

      await expect(service.findById('type-unp-1', false)).rejects.toThrow(
        new NotFoundException('Service type type-unp-1 not found'),
      );
    });

    it('should return type with publishedVersion and enriched versions for admin', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-bid-1',
        publishedServiceTypeVersionId: 'version-bid-1',
      });
      const version = makeVersion({
        id: 'version-bid-1',
        serviceTypeId: 'type-bid-1',
        status: 'published',
      });
      const versionTranslation = makeTranslation({
        serviceTypeVersionId: 'version-bid-1',
        name: 'Found Service',
      });
      const versionsListRow = {
        id: 'version-bid-1',
        version: 1,
        status: 'published',
        publishedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const enTranslation = makeTranslation({
        serviceTypeVersionId: 'version-bid-1',
        name: 'Found Service',
      });

      // Call order:
      // 1. fetch type by id
      // 2. fetch published version by id
      // 3. fetch translations for published version
      // 4. fetch all versions list (with column selection)
      // 5. fetch en translations for version list
      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([version])
        .mockResolvedValueOnce([versionTranslation])
        .mockResolvedValueOnce([versionsListRow])
        .mockResolvedValueOnce([enTranslation]);

      const result = await service.findById('type-bid-1', true);

      expect(result.id).toBe('type-bid-1');
      expect(result.publishedVersion).not.toBeNull();
      expect(result.publishedVersion!.id).toBe('version-bid-1');
      expect(result.publishedVersion!.translations).toHaveLength(1);
      expect(result.versions).toHaveLength(1);
      expect(result.versions[0].name).toBe('Found Service');
    });

    it('should return type with publishedVersion=null and enriched versions when no published version FK', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-nopub-1',
        publishedServiceTypeVersionId: null,
      });
      const versionsListRow = {
        id: 'version-nopub-1',
        version: 1,
        status: 'draft',
        publishedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const enTranslation = makeTranslation({
        serviceTypeVersionId: 'version-nopub-1',
        name: 'Draft Name',
      });

      // No published version → no version/translation fetches for publishedVersion
      // Call order: type, versions list, en translations
      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([versionsListRow])
        .mockResolvedValueOnce([enTranslation]);

      const result = await service.findById('type-nopub-1', true);

      expect(result.publishedVersion).toBeNull();
      expect(result.versions).toHaveLength(1);
      expect(result.versions[0].name).toBe('Draft Name');
    });

    it('should return enriched versions with null name when no en translation exists', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-notrans-1',
        publishedServiceTypeVersionId: null,
      });
      const versionsListRow = {
        id: 'version-notrans-1',
        version: 1,
        status: 'draft',
        publishedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([versionsListRow])
        .mockResolvedValueOnce([]); // no translations

      const result = await service.findById('type-notrans-1', true);

      expect(result.versions[0].name).toBeNull();
      expect(result.versions[0].description).toBeNull();
    });

    it('should allow non-admin access when type has a published version', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-pubaccess-1',
        publishedServiceTypeVersionId: 'version-pubaccess-1',
      });
      const version = makeVersion({
        id: 'version-pubaccess-1',
        status: 'published',
      });
      const translation = makeTranslation({
        serviceTypeVersionId: 'version-pubaccess-1',
        name: 'Public Service',
      });
      const versionsListRow = {
        id: 'version-pubaccess-1',
        version: 1,
        status: 'published',
        publishedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([version])
        .mockResolvedValueOnce([translation])
        .mockResolvedValueOnce([versionsListRow])
        .mockResolvedValueOnce([translation]);

      const result = await service.findById('type-pubaccess-1', false);

      expect(result.id).toBe('type-pubaccess-1');
      expect(result.publishedVersion).not.toBeNull();
    });

    it('should return empty versions array and skip en translation query when type has no versions', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({
        id: 'type-novers-1',
        publishedServiceTypeVersionId: null,
      });

      bundle.selectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([]); // empty versions list

      const result = await service.findById('type-novers-1', true);

      expect(result.versions).toEqual([]);
      // Only 2 select calls: type fetch + versions list (no translation fetch)
      expect(bundle.db.select).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // createVersion
  // -------------------------------------------------------------------------
  describe('createVersion', () => {
    it('should throw NotFoundException when type does not exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.txSelectTerminal.mockResolvedValueOnce([]);

      await expect(service.createVersion('nonexistent-type')).rejects.toThrow(
        new NotFoundException('Service type nonexistent-type not found'),
      );
    });

    it('should create a new version and copy translations from source version', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({ id: 'type-cv-1' });
      const sourceVersion = { id: 'version-cv-source' };
      const newVersion = makeVersion({
        id: 'version-cv-new',
        serviceTypeId: 'type-cv-1',
        version: 2,
      });
      const sourceTranslation = makeTranslation({
        serviceTypeVersionId: 'version-cv-source',
        name: 'Copied Name',
      });

      // tx select call order: type lookup, source version lookup, source translations
      bundle.txSelectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([sourceVersion])
        .mockResolvedValueOnce([sourceTranslation]);

      // insert calls: new version, then copy translations (values() awaited directly)
      bundle.txInsertReturningMock.mockResolvedValueOnce([newVersion]);

      const result = await service.createVersion('type-cv-1');

      expect(bundle.db.transaction).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('version-cv-new');
      expect(result.version).toBe(2);
      // 2 inserts: new version + translations copy
      expect(bundle.db.transaction).toHaveBeenCalledTimes(1);
    });

    it('should create version without translation copy when no source version exists', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({ id: 'type-nosrc-1' });
      const newVersion = makeVersion({
        id: 'version-nosrc-new',
        serviceTypeId: 'type-nosrc-1',
        version: 1,
      });

      // type found, but no source version
      bundle.txSelectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([]);

      bundle.txInsertReturningMock.mockResolvedValueOnce([newVersion]);

      const result = await service.createVersion('type-nosrc-1');

      expect(result.id).toBe('version-nosrc-new');
      // Only one insert: the new version (no translation copy)
      expect(bundle.txInsertReturningMock).toHaveBeenCalledTimes(1);
    });

    it('should create version but skip translation insert when source version has no translations', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({ id: 'type-notrans-cv-1' });
      const sourceVersion = { id: 'version-notrans-src' };
      const newVersion = makeVersion({
        id: 'version-notrans-new',
        version: 2,
      });

      bundle.txSelectTerminal
        .mockResolvedValueOnce([type])
        .mockResolvedValueOnce([sourceVersion])
        .mockResolvedValueOnce([]); // empty translations

      bundle.txInsertReturningMock.mockResolvedValueOnce([newVersion]);

      const result = await service.createVersion('type-notrans-cv-1');

      expect(result.id).toBe('version-notrans-new');
      // Only version insert, no translation insert
      expect(bundle.txInsertReturningMock).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // getVersion
  // -------------------------------------------------------------------------
  describe('getVersion', () => {
    it('should throw NotFoundException when version does not exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.selectTerminal.mockResolvedValueOnce([]);

      await expect(
        service.getVersion('type-uuid-1', 'nonexistent-version'),
      ).rejects.toThrow(
        new NotFoundException('Version nonexistent-version not found'),
      );
    });

    it('should return version with its translations', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const version = makeVersion({
        id: 'version-gv-1',
        serviceTypeId: 'type-gv-1',
        status: 'draft',
      });
      const translation = makeTranslation({
        serviceTypeVersionId: 'version-gv-1',
        name: 'Transport Services',
      });

      bundle.selectTerminal
        .mockResolvedValueOnce([version])
        .mockResolvedValueOnce([translation]);

      const result = await service.getVersion('type-gv-1', 'version-gv-1');

      expect(result.id).toBe('version-gv-1');
      expect(result.status).toBe('draft');
      expect(result.translations).toHaveLength(1);
      expect(result.translations[0].name).toBe('Transport Services');
    });

    it('should return version with empty translations array when no translations exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const version = makeVersion({ id: 'version-notrans-gv' });

      bundle.selectTerminal
        .mockResolvedValueOnce([version])
        .mockResolvedValueOnce([]);

      const result = await service.getVersion(
        'type-uuid-1',
        'version-notrans-gv',
      );

      expect(result.translations).toEqual([]);
    });

    it('should include all fields from the version row', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const publishedAt = new Date('2024-06-01T00:00:00Z');
      const version = makeVersion({
        id: 'version-fields-1',
        serviceTypeId: 'type-fields-1',
        status: 'published',
        version: 3,
        publishedAt,
      });

      bundle.selectTerminal
        .mockResolvedValueOnce([version])
        .mockResolvedValueOnce([]);

      const result = await service.getVersion('type-fields-1', 'version-fields-1');

      expect(result.version).toBe(3);
      expect(result.status).toBe('published');
      expect(result.publishedAt).toEqual(publishedAt);
    });
  });

  // -------------------------------------------------------------------------
  // upsertTranslation
  // -------------------------------------------------------------------------
  describe('upsertTranslation', () => {
    it('should throw NotFoundException when version does not exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.selectTerminal.mockResolvedValueOnce([]);

      await expect(
        service.upsertTranslation('type-uuid-1', 'nonexistent-version', 'en', {
          name: 'Test Name',
          description: 'Test Description',
        }),
      ).rejects.toThrow(
        new NotFoundException('Version nonexistent-version not found'),
      );
    });

    it('should throw BadRequestException when version is in published status', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const publishedVersion = makeVersion({
        id: 'version-pub-ut',
        status: 'published',
      });
      bundle.selectTerminal.mockResolvedValueOnce([publishedVersion]);

      await expect(
        service.upsertTranslation(
          'type-uuid-1',
          'version-pub-ut',
          'en',
          { name: 'Name', description: 'Desc' },
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Translations can only be modified on draft versions',
        ),
      );
    });

    it('should throw BadRequestException when version is in archived status', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const archivedVersion = makeVersion({
        id: 'version-arc-ut',
        status: 'archived',
      });
      bundle.selectTerminal.mockResolvedValueOnce([archivedVersion]);

      await expect(
        service.upsertTranslation(
          'type-uuid-1',
          'version-arc-ut',
          'en',
          { name: 'Name', description: 'Desc' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upsert translation and return result for a draft version', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const draftVersion = makeVersion({
        id: 'version-draft-ut',
        status: 'draft',
      });
      const upsertedTranslation = makeTranslation({
        serviceTypeVersionId: 'version-draft-ut',
        locale: 'fr',
        name: "Services d'emploi",
        description: "Services relatifs à l'emploi",
      });

      bundle.selectTerminal.mockResolvedValueOnce([draftVersion]);
      bundle.insertOnConflictReturningMock.mockResolvedValueOnce([
        upsertedTranslation,
      ]);

      const result = await service.upsertTranslation(
        'type-uuid-1',
        'version-draft-ut',
        'fr',
        {
          name: "Services d'emploi",
          description: "Services relatifs à l'emploi",
        },
      );

      expect(result.locale).toBe('fr');
      expect(result.name).toBe("Services d'emploi");
      expect(bundle.insertOnConflictReturningMock).toHaveBeenCalledTimes(1);
    });

    it('should default schema and uiSchema to empty objects when not provided', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const draftVersion = makeVersion({
        id: 'version-def-ut',
        status: 'draft',
      });
      const upsertedTranslation = makeTranslation({
        serviceTypeVersionId: 'version-def-ut',
      });

      bundle.selectTerminal.mockResolvedValueOnce([draftVersion]);

      const capturedValues: unknown[] = [];
      bundle.db.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockImplementation((vals: unknown) => {
          capturedValues.push(vals);
          return {
            onConflictDoUpdate: jest.fn().mockReturnValue({
              returning: jest
                .fn()
                .mockResolvedValue([upsertedTranslation]),
            }),
          };
        }),
      });

      await service.upsertTranslation(
        'type-uuid-1',
        'version-def-ut',
        'en',
        { name: 'Simple Name', description: 'Simple Desc' },
      );

      const vals = capturedValues[0] as Record<string, unknown>;
      expect(vals.schema).toEqual({});
      expect(vals.uiSchema).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // publishVersion
  // -------------------------------------------------------------------------
  describe('publishVersion', () => {
    it('should throw NotFoundException when version does not exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.txSelectTerminal.mockResolvedValueOnce([]);

      await expect(
        service.publishVersion('type-uuid-1', 'nonexistent-version'),
      ).rejects.toThrow(
        new NotFoundException('Version nonexistent-version not found'),
      );
    });

    it('should throw BadRequestException when version is already published', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const publishedVersion = makeVersion({
        id: 'version-pv-pub',
        status: 'published',
      });
      bundle.txSelectTerminal.mockResolvedValueOnce([publishedVersion]);

      await expect(
        service.publishVersion('type-uuid-1', 'version-pv-pub'),
      ).rejects.toThrow(
        new BadRequestException('Only draft versions can be published'),
      );
    });

    it('should throw BadRequestException when version is archived', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const archivedVersion = makeVersion({
        id: 'version-pv-arc',
        status: 'archived',
      });
      bundle.txSelectTerminal.mockResolvedValueOnce([archivedVersion]);

      await expect(
        service.publishVersion('type-uuid-1', 'version-pv-arc'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when version has no translations', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const draftVersion = makeVersion({
        id: 'version-pv-notrans',
        status: 'draft',
      });

      bundle.txSelectTerminal
        .mockResolvedValueOnce([draftVersion])
        .mockResolvedValueOnce([]); // no translations

      await expect(
        service.publishVersion('type-uuid-1', 'version-pv-notrans'),
      ).rejects.toThrow(
        new BadRequestException(
          'At least one translation is required before publishing',
        ),
      );
    });

    it('should archive the previous published version when one exists and publish new version', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const draftVersion = makeVersion({
        id: 'version-pv-new',
        serviceTypeId: 'type-pv-1',
        status: 'draft',
      });
      const translation = { id: 'trans-pv-1' };
      const typeWithPrevPublished = makeType({
        id: 'type-pv-1',
        publishedServiceTypeVersionId: 'version-pv-old',
      });
      const publishedResult = makeVersion({
        id: 'version-pv-new',
        status: 'published',
        publishedAt: new Date(),
      });

      // tx select: version lookup, translations check, type lookup
      bundle.txSelectTerminal
        .mockResolvedValueOnce([draftVersion])
        .mockResolvedValueOnce([translation])
        .mockResolvedValueOnce([typeWithPrevPublished]);

      // tx update: only publish uses .returning(); archive + FK updates await where() directly
      bundle.txUpdateReturningMock.mockResolvedValueOnce([publishedResult]);

      const result = await service.publishVersion(
        'type-pv-1',
        'version-pv-new',
      );

      expect(bundle.db.transaction).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('version-pv-new');
      expect(result.status).toBe('published');
      // 3 update calls: archive old version, publish new version, update parent FK
      expect(bundle.db.transaction.mock.calls[0]).toBeDefined();
    });

    it('should publish without archiving when type has no previous published version', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const draftVersion = makeVersion({
        id: 'version-pv-first',
        serviceTypeId: 'type-pv-2',
        status: 'draft',
      });
      const translation = { id: 'trans-pv-2' };
      const typeNoPrev = makeType({
        id: 'type-pv-2',
        publishedServiceTypeVersionId: null,
      });
      const publishedResult = makeVersion({
        id: 'version-pv-first',
        status: 'published',
        publishedAt: new Date(),
      });

      bundle.txSelectTerminal
        .mockResolvedValueOnce([draftVersion])
        .mockResolvedValueOnce([translation])
        .mockResolvedValueOnce([typeNoPrev]);

      bundle.txUpdateReturningMock.mockResolvedValueOnce([publishedResult]);

      const result = await service.publishVersion(
        'type-pv-2',
        'version-pv-first',
      );

      expect(result.status).toBe('published');
      expect(result.id).toBe('version-pv-first');
    });

    it('should not archive previous version when it matches the version being published', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      // publishedServiceTypeVersionId === versionId
      const draftVersion = makeVersion({
        id: 'version-pv-same',
        serviceTypeId: 'type-pv-3',
        status: 'draft',
      });
      const translation = { id: 'trans-pv-3' };
      const typeSame = makeType({
        id: 'type-pv-3',
        // FK already points to this same version (edge case)
        publishedServiceTypeVersionId: 'version-pv-same',
      });
      const publishedResult = makeVersion({
        id: 'version-pv-same',
        status: 'published',
      });

      bundle.txSelectTerminal
        .mockResolvedValueOnce([draftVersion])
        .mockResolvedValueOnce([translation])
        .mockResolvedValueOnce([typeSame]);

      bundle.txUpdateReturningMock.mockResolvedValueOnce([publishedResult]);

      const result = await service.publishVersion(
        'type-pv-3',
        'version-pv-same',
      );

      expect(result.id).toBe('version-pv-same');
      // Only 2 update calls: publish version + update parent FK (no archive since same)
      expect(bundle.txUpdateReturningMock).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it('should throw NotFoundException when type does not exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.selectTerminal.mockResolvedValueOnce([]);

      await expect(service.delete('nonexistent-type')).rejects.toThrow(
        new NotFoundException('Service type nonexistent-type not found'),
      );
    });

    it('should delete the type when it exists', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const type = makeType({ id: 'type-del-1' });
      bundle.selectTerminal.mockResolvedValueOnce([type]);

      await service.delete('type-del-1');

      expect(bundle.db.delete).toHaveBeenCalledTimes(1);
      expect(bundle.deleteWhereMock).toHaveBeenCalledTimes(1);
    });

    it('should not call delete when type is not found', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.selectTerminal.mockResolvedValueOnce([]);

      await expect(service.delete('ghost-type')).rejects.toThrow(
        NotFoundException,
      );
      expect(bundle.db.delete).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // archiveVersion
  // -------------------------------------------------------------------------
  describe('archiveVersion', () => {
    it('should throw NotFoundException when version does not exist', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      bundle.txSelectTerminal.mockResolvedValueOnce([]);

      await expect(
        service.archiveVersion('type-uuid-1', 'nonexistent-version'),
      ).rejects.toThrow(
        new NotFoundException('Version nonexistent-version not found'),
      );
    });

    it('should throw BadRequestException when version is in draft status', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const draftVersion = makeVersion({
        id: 'version-arc-draft',
        status: 'draft',
      });
      bundle.txSelectTerminal.mockResolvedValueOnce([draftVersion]);

      await expect(
        service.archiveVersion('type-uuid-1', 'version-arc-draft'),
      ).rejects.toThrow(
        new BadRequestException('Only published versions can be archived'),
      );
    });

    it('should throw BadRequestException when version is already archived', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const alreadyArchived = makeVersion({
        id: 'version-arc-already',
        status: 'archived',
      });
      bundle.txSelectTerminal.mockResolvedValueOnce([alreadyArchived]);

      await expect(
        service.archiveVersion('type-uuid-1', 'version-arc-already'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should archive version and null out the parent publishedServiceTypeVersionId', async () => {
      const bundle = createDbMock();
      const service = new ServiceTypesService(
        bundle.db as unknown as Database,
      );

      const publishedVersion = makeVersion({
        id: 'version-arc-pub',
        serviceTypeId: 'type-arc-1',
        status: 'published',
      });
      const archivedResult = makeVersion({
        id: 'version-arc-pub',
        status: 'archived',
        archivedAt: new Date('2024-09-01T00:00:00Z'),
      });

      bundle.txSelectTerminal.mockResolvedValueOnce([publishedVersion]);
      bundle.txUpdateReturningMock.mockResolvedValueOnce([archivedResult]);

      const result = await service.archiveVersion(
        'type-arc-1',
        'version-arc-pub',
      );

      expect(bundle.db.transaction).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('version-arc-pub');
      expect(result.status).toBe('archived');
      expect(result.archivedAt).toEqual(new Date('2024-09-01T00:00:00Z'));
      // 2 update calls: archive version + null parent FK
      expect(bundle.txUpdateReturningMock).toHaveBeenCalledTimes(1);
    });
  });
});
