import { BadRequestException, NotFoundException } from '@nestjs/common';
import { type Database } from '@repo/db';
import { ConsentDocumentTypesService } from '../consent-document-types.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TYPE_ID = 'cdt-aaaa-0001';
const VERSION_ID = 'cdtv-bbbb-0001';
const VERSION_ID_2 = 'cdtv-bbbb-0002';
const TRANSLATION_ID = 'cdtt-cccc-0001';

const makeType = (
  overrides: Partial<{
    id: string;
    publishedConsentDocumentTypeVersionId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  id: TYPE_ID,
  publishedConsentDocumentTypeVersionId: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

const makeVersion = (
  overrides: Partial<{
    id: string;
    consentDocumentTypeId: string;
    version: number;
    status: string;
    publishedAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  id: VERSION_ID,
  consentDocumentTypeId: TYPE_ID,
  version: 1,
  status: 'draft',
  publishedAt: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

const makeTranslation = (
  overrides: Partial<{
    id: string;
    consentDocumentTypeVersionId: string;
    locale: string;
    name: string;
    description: string;
    schema: Record<string, unknown>;
    uiSchema: Record<string, unknown>;
  }> = {},
) => ({
  id: TRANSLATION_ID,
  consentDocumentTypeVersionId: VERSION_ID,
  locale: 'en',
  name: 'Privacy Consent',
  description: 'Consent for data collection',
  schema: { type: 'object' },
  uiSchema: {},
  ...overrides,
});

// ---------------------------------------------------------------------------
// DB mock factory
// ---------------------------------------------------------------------------

/**
 * Builds a chainable Drizzle ORM mock.
 *
 * Both `db` and `tx` (inside transactions) use a result queue: push expected
 * return values in order of DB call execution. Each queue entry is consumed
 * once.
 */
const createDbMock = () => {
  // ---- shared queue builder ----
  // Returns a self-contained select chain where each terminal call (.limit(),
  // .offset(), or a thenable .where()/.orderBy()) drains one item from the
  // provided results array.
  const buildSelectChain = (results: unknown[][], index: { value: number }) => {
    const drain = () => {
      const r = results[index.value] ?? [];
      index.value++;
      return Promise.resolve(r);
    };

    // A terminal node: resolves from queue when awaited, and exposes .limit()
    // so callers that chain further still work.
    const terminal = () => {
      const p = drain();
      // Make it thenable so `await` works directly
      return Object.assign(p, {
        limit: () => terminal(),
        offset: () => terminal(),
        orderBy: () => terminal(),
      });
    };

    // We build the chain bottom-up: offset → limit → orderBy → where → from → select
    const offsetMock = jest.fn(() => terminal());
    const limitMock = jest.fn(() => ({
      offset: offsetMock,
      ...asTerminal(terminal),
    }));
    const orderByMock = jest.fn(() => ({
      limit: limitMock,
      offset: offsetMock,
      ...asTerminal(terminal),
    }));
    const whereMock = jest.fn(() => ({
      limit: limitMock,
      orderBy: orderByMock,
      ...asTerminal(terminal),
    }));

    // innerJoin chain mirrors the real chain:
    // .innerJoin().innerJoin().where().orderBy().limit().offset()
    const innerInnerJoin = jest.fn(() => ({
      where: whereMock,
      orderBy: orderByMock,
    }));
    const innerJoinMock = jest.fn(() => ({
      innerJoin: innerInnerJoin,
      where: whereMock,
    }));

    const fromMock = jest.fn(() => ({
      where: whereMock,
      innerJoin: innerJoinMock,
      orderBy: orderByMock,
      ...asTerminal(terminal),
    }));

    const selectMock = jest.fn(() => ({ from: fromMock }));

    return {
      selectMock,
      fromMock,
      whereMock,
      orderByMock,
      limitMock,
      offsetMock,
      innerJoinMock,
      innerInnerJoin,
    };
  };

  // Helper: attach then/catch/finally so the object is thenable (resolves via terminal())
  const asTerminal = (terminal: () => Promise<unknown>) => ({
    then: (
      onFulfilled: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => terminal().then(onFulfilled, onRejected),
    catch: (onRejected: (e: unknown) => unknown) =>
      terminal().catch(onRejected),
    finally: (onFinally: () => void) => terminal().finally(onFinally),
  });

  // ---- db select queue ----
  const dbSelectResults: unknown[][] = [];
  const dbSelectIndex = { value: 0 };
  const dbChain = buildSelectChain(dbSelectResults, dbSelectIndex);

  // ---- tx select queue ----
  const txSelectResults: unknown[][] = [];
  const txSelectIndex = { value: 0 };
  const txChain = buildSelectChain(txSelectResults, txSelectIndex);

  // ---- db insert chain ----
  const insertOnConflictDoUpdateMock = jest.fn().mockReturnValue({
    returning: jest.fn().mockResolvedValue([makeTranslation()]),
  });
  const insertReturningMock = jest.fn().mockResolvedValue([makeType()]);
  const insertValuesMock = jest.fn().mockReturnValue({
    returning: insertReturningMock,
    onConflictDoUpdate: insertOnConflictDoUpdateMock,
  });
  const insertMock = jest.fn().mockReturnValue({ values: insertValuesMock });

  // ---- db update chain ----
  const updateReturningMock = jest.fn().mockResolvedValue([makeVersion()]);
  const updateWhereMock = jest
    .fn()
    .mockReturnValue({ returning: updateReturningMock });
  const updateSetMock = jest.fn().mockReturnValue({ where: updateWhereMock });
  const updateMock = jest.fn().mockReturnValue({ set: updateSetMock });

  // ---- db delete chain ----
  const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
  const deleteMock = jest.fn().mockReturnValue({ where: deleteWhereMock });

  // ---- tx insert chain ----
  const txInsertOnConflictMock = jest.fn().mockReturnValue({
    returning: jest.fn().mockResolvedValue([makeTranslation()]),
  });
  const txInsertReturningMock = jest.fn().mockResolvedValue([makeType()]);
  const txInsertValuesMock = jest.fn().mockReturnValue({
    returning: txInsertReturningMock,
    onConflictDoUpdate: txInsertOnConflictMock,
  });
  const txInsertMock = jest
    .fn()
    .mockReturnValue({ values: txInsertValuesMock });

  // ---- tx update chain ----
  const txUpdateReturningMock = jest
    .fn()
    .mockResolvedValue([makeVersion({ status: 'archived' })]);
  const txUpdateWhereMock = jest
    .fn()
    .mockReturnValue({ returning: txUpdateReturningMock });
  const txUpdateSetMock = jest
    .fn()
    .mockReturnValue({ where: txUpdateWhereMock });
  const txUpdateMock = jest.fn().mockReturnValue({ set: txUpdateSetMock });

  const tx = {
    select: txChain.selectMock,
    insert: txInsertMock,
    update: txUpdateMock,
  };

  const transactionMock = jest.fn(async (cb: (txArg: typeof tx) => unknown) => {
    txSelectIndex.value = 0; // reset per transaction
    return cb(tx);
  });

  const db = {
    select: dbChain.selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    transaction: transactionMock,
  };

  return {
    db,
    // db select queue
    selectResults: dbSelectResults,
    selectMock: dbChain.selectMock,
    // db insert helpers
    insertMock,
    insertValuesMock,
    insertReturningMock,
    insertOnConflictDoUpdateMock,
    // db update helpers
    updateMock,
    updateSetMock,
    updateWhereMock,
    updateReturningMock,
    // db delete helpers
    deleteMock,
    deleteWhereMock,
    // transaction helpers
    transactionMock,
    tx,
    txSelectResults,
    txInsertMock,
    txInsertValuesMock,
    txInsertReturningMock,
    txUpdateMock,
    txUpdateSetMock,
    txUpdateWhereMock,
    txUpdateReturningMock,
  };
};

// ---------------------------------------------------------------------------
// Helper to build service from a mock bundle
// ---------------------------------------------------------------------------

const buildService = (bundle: ReturnType<typeof createDbMock>) =>
  new ConsentDocumentTypesService(bundle.db as unknown as Database);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConsentDocumentTypesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('should run a transaction and return the new type with version and translation', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const createdType = makeType();
      const createdVersion = makeVersion();
      const createdTranslation = makeTranslation();

      bundle.txInsertReturningMock
        .mockResolvedValueOnce([createdType])
        .mockResolvedValueOnce([createdVersion])
        .mockResolvedValueOnce([createdTranslation]);

      const result = await service.create({
        name: 'Privacy Consent',
        description: 'Consent for data collection',
        schema: { type: 'object' },
        uiSchema: { 'ui:order': ['*'] },
      });

      expect(bundle.transactionMock).toHaveBeenCalledTimes(1);
      expect(bundle.txInsertMock).toHaveBeenCalledTimes(3);
      expect(result.id).toBe(TYPE_ID);
      expect(result.version.id).toBe(VERSION_ID);
      expect(result.version.status).toBe('draft');
      expect(result.version.translations).toHaveLength(1);
      expect(result.version.translations[0].locale).toBe('en');
      expect(result.version.translations[0].name).toBe('Privacy Consent');
    });

    it('should default schema and uiSchema to empty objects when not provided', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const translationWithDefaults = makeTranslation({
        schema: {},
        uiSchema: {},
      });

      bundle.txInsertReturningMock
        .mockResolvedValueOnce([makeType()])
        .mockResolvedValueOnce([makeVersion()])
        .mockResolvedValueOnce([translationWithDefaults]);

      await service.create({
        name: 'Minimal Consent',
        description: 'No schema provided',
      });

      const translationValuesCall = bundle.txInsertValuesMock.mock
        .calls[2][0] as Record<string, unknown>;
      expect(translationValuesCall.schema).toEqual({});
      expect(translationValuesCall.uiSchema).toEqual({});
    });

    it('should propagate transaction errors', async () => {
      const bundle = createDbMock();
      bundle.transactionMock.mockRejectedValueOnce(
        new Error('DB connection lost'),
      );
      const service = buildService(bundle);

      await expect(
        service.create({ name: 'x', description: 'y' }),
      ).rejects.toThrow('DB connection lost');
    });
  });

  // -------------------------------------------------------------------------
  // findAllPublished
  // -------------------------------------------------------------------------

  describe('findAllPublished', () => {
    it('should return paginated results with correct metadata', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const rows = [
        { id: TYPE_ID, name: 'Privacy Consent' },
        { id: 'cdt-aaaa-0002', name: 'Terms of Service' },
      ];

      bundle.selectResults.push(rows);
      bundle.selectResults.push([{ count: 2 }]);

      const result = await service.findAllPublished(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Privacy Consent');
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should calculate correct totalPages when total exceeds limit', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([{ id: TYPE_ID, name: 'Consent A' }]);
      bundle.selectResults.push([{ count: 25 }]);

      const result = await service.findAllPublished(2, 10);

      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should pass search term to query when provided and return filtered results', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([{ id: TYPE_ID, name: 'Privacy Consent' }]);
      bundle.selectResults.push([{ count: 1 }]);

      const result = await service.findAllPublished(1, 10, 'privacy');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Privacy Consent');
      expect(result.total).toBe(1);
    });

    it('should return empty data and zero totals when no published types match', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([]);
      bundle.selectResults.push([{ count: 0 }]);

      const result = await service.findAllPublished(1, 10, 'nonexistent');

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    it('should return all types for an admin (no published filter)', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const unpublishedType = makeType({ id: 'cdt-draft-001' });
      const publishedType = makeType({
        id: 'cdt-pub-001',
        publishedConsentDocumentTypeVersionId: VERSION_ID,
      });

      bundle.selectResults.push([unpublishedType, publishedType]);
      bundle.selectResults.push([{ count: 2 }]);
      // enrichTypesWithTranslations: versions query
      bundle.selectResults.push([
        makeVersion({ consentDocumentTypeId: 'cdt-draft-001' }),
        makeVersion({
          id: VERSION_ID,
          consentDocumentTypeId: 'cdt-pub-001',
          status: 'published',
        }),
      ]);
      // enrichTypesWithTranslations: translations query
      bundle.selectResults.push([
        makeTranslation({
          consentDocumentTypeVersionId: VERSION_ID,
          name: 'Published Consent',
        }),
      ]);

      const result = await service.findAll(1, 10, true);

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('should apply published filter for non-admin users', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const publishedType = makeType({
        publishedConsentDocumentTypeVersionId: VERSION_ID,
      });

      bundle.selectResults.push([publishedType]);
      bundle.selectResults.push([{ count: 1 }]);
      bundle.selectResults.push([
        makeVersion({ id: VERSION_ID, status: 'published' }),
      ]);
      bundle.selectResults.push([
        makeTranslation({ name: 'Published Consent' }),
      ]);

      const result = await service.findAll(1, 10, false);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Published Consent');
    });

    it('should filter by search term when provided', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const matchedType = makeType({
        publishedConsentDocumentTypeVersionId: VERSION_ID,
      });

      bundle.selectResults.push([matchedType]);
      bundle.selectResults.push([{ count: 1 }]);
      bundle.selectResults.push([makeVersion({ id: VERSION_ID })]);
      bundle.selectResults.push([makeTranslation({ name: 'FOIPPA Consent' })]);

      const result = await service.findAll(1, 10, true, 'FOIPPA');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('FOIPPA Consent');
    });

    it('should return empty data when no types exist', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([]);
      bundle.selectResults.push([{ count: 0 }]);

      const result = await service.findAll(1, 10, true);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // enrichTypesWithTranslations (exercised through findAll)
  // -------------------------------------------------------------------------

  describe('enrichTypesWithTranslations (via findAll)', () => {
    it('should set name and description to null when type has no versions', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const typeWithNoVersions = makeType({ id: 'cdt-no-ver-001' });

      bundle.selectResults.push([typeWithNoVersions]);
      bundle.selectResults.push([{ count: 1 }]);
      // versions query returns empty — relevantVersionIds will be empty
      bundle.selectResults.push([]);
      // no translations query because relevantVersionIds is empty

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].name).toBeNull();
      expect(result.data[0].description).toBeNull();
      expect(result.data[0].updatesPending).toBe(false);
    });

    it('should use published version translation when a published version exists', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const publishedVersionId = 'cdtv-pub-ver-001';
      const draftVersionId = 'cdtv-draft-001';

      const typeWithPublished = makeType({
        id: 'cdt-with-pub-001',
        publishedConsentDocumentTypeVersionId: publishedVersionId,
      });

      bundle.selectResults.push([typeWithPublished]);
      bundle.selectResults.push([{ count: 1 }]);
      // versions sorted desc: draft (newer) first, published second
      bundle.selectResults.push([
        makeVersion({
          id: draftVersionId,
          consentDocumentTypeId: 'cdt-with-pub-001',
          version: 2,
          status: 'draft',
        }),
        makeVersion({
          id: publishedVersionId,
          consentDocumentTypeId: 'cdt-with-pub-001',
          version: 1,
          status: 'published',
        }),
      ]);
      bundle.selectResults.push([
        makeTranslation({
          id: 'cdtt-pub-001',
          consentDocumentTypeVersionId: publishedVersionId,
          name: 'Published Name',
          description: 'Published Description',
        }),
      ]);

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].name).toBe('Published Name');
      expect(result.data[0].description).toBe('Published Description');
    });

    it('should set updatesPending=true when a published version exists and a draft also exists', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const publishedVersionId = 'cdtv-pub-002';
      const draftVersionId = 'cdtv-draft-002';

      const typeWithBoth = makeType({
        id: 'cdt-updates-pending-001',
        publishedConsentDocumentTypeVersionId: publishedVersionId,
      });

      bundle.selectResults.push([typeWithBoth]);
      bundle.selectResults.push([{ count: 1 }]);
      bundle.selectResults.push([
        makeVersion({
          id: draftVersionId,
          consentDocumentTypeId: 'cdt-updates-pending-001',
          version: 2,
          status: 'draft',
        }),
        makeVersion({
          id: publishedVersionId,
          consentDocumentTypeId: 'cdt-updates-pending-001',
          version: 1,
          status: 'published',
        }),
      ]);
      bundle.selectResults.push([
        makeTranslation({ consentDocumentTypeVersionId: publishedVersionId }),
      ]);

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].updatesPending).toBe(true);
    });

    it('should set updatesPending=false when published version exists but no draft exists', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const publishedVersionId = 'cdtv-pub-003';

      const typePublishedOnly = makeType({
        id: 'cdt-no-pending-001',
        publishedConsentDocumentTypeVersionId: publishedVersionId,
      });

      bundle.selectResults.push([typePublishedOnly]);
      bundle.selectResults.push([{ count: 1 }]);
      bundle.selectResults.push([
        makeVersion({
          id: publishedVersionId,
          consentDocumentTypeId: 'cdt-no-pending-001',
          version: 1,
          status: 'published',
        }),
      ]);
      bundle.selectResults.push([
        makeTranslation({ consentDocumentTypeVersionId: publishedVersionId }),
      ]);

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].updatesPending).toBe(false);
    });

    it('should use latest version translation when no published version exists', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const draftVersionId = 'cdtv-latest-draft-001';

      const typeUnpublished = makeType({
        id: 'cdt-unpublished-001',
        publishedConsentDocumentTypeVersionId: null,
      });

      bundle.selectResults.push([typeUnpublished]);
      bundle.selectResults.push([{ count: 1 }]);
      bundle.selectResults.push([
        makeVersion({
          id: draftVersionId,
          consentDocumentTypeId: 'cdt-unpublished-001',
          version: 1,
          status: 'draft',
        }),
      ]);
      bundle.selectResults.push([
        makeTranslation({
          consentDocumentTypeVersionId: draftVersionId,
          name: 'Draft Name',
          description: 'Draft Description',
        }),
      ]);

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].name).toBe('Draft Name');
      expect(result.data[0].description).toBe('Draft Description');
      expect(result.data[0].updatesPending).toBe(false);
    });

    it('should return null name/description when all display version IDs are empty strings', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      // Type has no versions → displayVersionId is '' → relevantVersionIds empty after filter
      const typeWithNoVersions = makeType({ id: 'cdt-empty-vids-001' });

      bundle.selectResults.push([typeWithNoVersions]);
      bundle.selectResults.push([{ count: 1 }]);
      bundle.selectResults.push([]); // no versions → displayVersionId = ''

      const result = await service.findAll(1, 10, true);

      expect(result.data[0].name).toBeNull();
      expect(result.data[0].description).toBeNull();
      expect(result.data[0].updatesPending).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe('findById', () => {
    it('should throw NotFoundException when type does not exist', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([]); // type not found

      await expect(service.findById('nonexistent-id', true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include the typeId in the NotFoundException message', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([]);

      await expect(service.findById('missing-type-abc', true)).rejects.toThrow(
        'missing-type-abc',
      );
    });

    it('should throw NotFoundException for non-admin accessing an unpublished type', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([
        makeType({ publishedConsentDocumentTypeVersionId: null }),
      ]);

      await expect(service.findById(TYPE_ID, false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return type with null publishedVersion when no published FK is set (admin)', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([
        makeType({ publishedConsentDocumentTypeVersionId: null }),
      ]);
      // versions list query (no versions)
      bundle.selectResults.push([]);

      const result = await service.findById(TYPE_ID, true);

      expect(result.publishedVersion).toBeNull();
      expect(result.id).toBe(TYPE_ID);
    });

    it('should return enriched publishedVersion with translations when published FK is set', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const typeWithPublished = makeType({
        publishedConsentDocumentTypeVersionId: VERSION_ID,
      });
      const publishedVersion = makeVersion({
        id: VERSION_ID,
        status: 'published',
      });
      const translation = makeTranslation({ name: 'Published Translation' });

      bundle.selectResults.push([typeWithPublished]); // type lookup
      bundle.selectResults.push([publishedVersion]); // published version lookup
      bundle.selectResults.push([translation]); // translations for published version
      bundle.selectResults.push([publishedVersion]); // all versions list
      bundle.selectResults.push([translation]); // en translations for versions list

      const result = await service.findById(TYPE_ID, true);

      expect(result.publishedVersion).not.toBeNull();
      expect(result.publishedVersion!.id).toBe(VERSION_ID);
      expect(result.publishedVersion!.translations).toHaveLength(1);
      expect(result.publishedVersion!.translations[0].name).toBe(
        'Published Translation',
      );
    });

    it('should return enriched versions list with name and description from en translations', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const typeWithPublished = makeType({
        publishedConsentDocumentTypeVersionId: VERSION_ID,
      });
      const v1 = makeVersion({
        id: VERSION_ID,
        version: 1,
        status: 'published',
      });
      const v2 = makeVersion({ id: VERSION_ID_2, version: 2, status: 'draft' });
      const t1 = makeTranslation({
        consentDocumentTypeVersionId: VERSION_ID,
        name: 'Version 1 Name',
      });
      const t2 = makeTranslation({
        id: 'cdtt-2',
        consentDocumentTypeVersionId: VERSION_ID_2,
        name: 'Version 2 Name',
      });

      bundle.selectResults.push([typeWithPublished]);
      bundle.selectResults.push([v1]);
      bundle.selectResults.push([t1]);
      bundle.selectResults.push([v1, v2]);
      bundle.selectResults.push([t1, t2]);

      const result = await service.findById(TYPE_ID, true);

      expect(result.versions).toHaveLength(2);
      expect(result.versions[0].name).toBe('Version 1 Name');
      expect(result.versions[1].name).toBe('Version 2 Name');
    });

    it('should allow admin to access an unpublished type', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([
        makeType({ publishedConsentDocumentTypeVersionId: null }),
      ]);
      bundle.selectResults.push([]); // versions list empty

      const result = await service.findById(TYPE_ID, true);

      expect(result.id).toBe(TYPE_ID);
      expect(result.publishedVersion).toBeNull();
    });

    it('should return versions with null name/description when no en translation exists for a version', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const typeWithPublished = makeType({
        publishedConsentDocumentTypeVersionId: VERSION_ID,
      });
      const v1 = makeVersion({ id: VERSION_ID, status: 'published' });

      bundle.selectResults.push([typeWithPublished]);
      bundle.selectResults.push([v1]);
      bundle.selectResults.push([makeTranslation()]);
      bundle.selectResults.push([v1]);
      bundle.selectResults.push([]); // no en translations for versions list

      const result = await service.findById(TYPE_ID, true);

      expect(result.versions[0].name).toBeNull();
      expect(result.versions[0].description).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // createVersion
  // -------------------------------------------------------------------------

  describe('createVersion', () => {
    it('should throw NotFoundException when the consent document type does not exist', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([]); // type not found

      await expect(service.createVersion('nonexistent-type')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include the typeId in the NotFoundException message', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([]);

      await expect(service.createVersion('missing-type-xyz')).rejects.toThrow(
        'missing-type-xyz',
      );
    });

    it('should create a new draft version without copying translations when no source version exists', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const newVersion = makeVersion({ id: 'cdtv-new-001', version: 1 });

      bundle.txSelectResults.push([makeType()]);
      bundle.txSelectResults.push([]); // no source version
      bundle.txInsertReturningMock.mockResolvedValueOnce([newVersion]);

      const result = await service.createVersion(TYPE_ID);

      expect(bundle.transactionMock).toHaveBeenCalledTimes(1);
      expect(bundle.txInsertMock).toHaveBeenCalledTimes(1); // only version insert
      expect(result.id).toBe('cdtv-new-001');
      expect(result.status).toBe('draft');
    });

    it('should copy source version translations into the new version', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const sourceVersionId = 'cdtv-source-001';
      const newVersionId = 'cdtv-new-002';
      const newVersion = makeVersion({ id: newVersionId, version: 2 });
      const sourceTranslation = makeTranslation({
        consentDocumentTypeVersionId: sourceVersionId,
        name: 'Copied Name',
        description: 'Copied Description',
        schema: { type: 'string' },
        uiSchema: { 'ui:widget': 'textarea' },
      });

      bundle.txSelectResults.push([makeType()]);
      bundle.txSelectResults.push([{ id: sourceVersionId }]);
      bundle.txInsertReturningMock.mockResolvedValueOnce([newVersion]);
      bundle.txSelectResults.push([sourceTranslation]);

      const result = await service.createVersion(TYPE_ID);

      expect(result.id).toBe(newVersionId);
      // Two inserts: version + translation copy
      expect(bundle.txInsertMock).toHaveBeenCalledTimes(2);

      const copyCall = bundle.txInsertValuesMock.mock.calls[1][0] as Array<
        Record<string, unknown>
      >;
      expect(copyCall[0].consentDocumentTypeVersionId).toBe(newVersionId);
      expect(copyCall[0].locale).toBe('en');
      expect(copyCall[0].name).toBe('Copied Name');
      expect(copyCall[0].description).toBe('Copied Description');
      expect(copyCall[0].schema).toEqual({ type: 'string' });
    });

    it('should not copy translations when source version has no translations', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const sourceVersionId = 'cdtv-source-notrans';
      const newVersion = makeVersion({ id: 'cdtv-new-notrans', version: 2 });

      bundle.txSelectResults.push([makeType()]);
      bundle.txSelectResults.push([{ id: sourceVersionId }]);
      bundle.txInsertReturningMock.mockResolvedValueOnce([newVersion]);
      bundle.txSelectResults.push([]); // empty translations

      await service.createVersion(TYPE_ID);

      // Only version insert — no translation copy
      expect(bundle.txInsertMock).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // getVersion
  // -------------------------------------------------------------------------

  describe('getVersion', () => {
    it('should throw NotFoundException when version does not exist for the given type', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([]);

      await expect(
        service.getVersion(TYPE_ID, 'nonexistent-ver'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include the versionId in the NotFoundException message', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([]);

      await expect(
        service.getVersion(TYPE_ID, 'bad-version-id'),
      ).rejects.toThrow('bad-version-id');
    });

    it('should return version with translations when found', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const version = makeVersion({ id: VERSION_ID, status: 'draft' });
      const translations = [
        makeTranslation({ locale: 'en', name: 'English Name' }),
        makeTranslation({ id: 'cdtt-fr', locale: 'fr', name: 'French Name' }),
      ];

      bundle.selectResults.push([version]);
      bundle.selectResults.push(translations);

      const result = await service.getVersion(TYPE_ID, VERSION_ID);

      expect(result.id).toBe(VERSION_ID);
      expect(result.status).toBe('draft');
      expect(result.translations).toHaveLength(2);
      expect(result.translations[0].locale).toBe('en');
      expect(result.translations[1].locale).toBe('fr');
    });

    it('should return version with empty translations array when no translations exist', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([makeVersion()]);
      bundle.selectResults.push([]);

      const result = await service.getVersion(TYPE_ID, VERSION_ID);

      expect(result.translations).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // upsertTranslation
  // -------------------------------------------------------------------------

  describe('upsertTranslation', () => {
    it('should throw NotFoundException when version does not exist', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([]);

      await expect(
        service.upsertTranslation(TYPE_ID, 'nonexistent-ver', 'en', {
          name: 'Test',
          description: 'Desc',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when version is published (not draft)', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([makeVersion({ status: 'published' })]);

      await expect(
        service.upsertTranslation(TYPE_ID, VERSION_ID, 'en', {
          name: 'Test',
          description: 'Desc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include "draft" in the BadRequestException message for non-draft versions', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([makeVersion({ status: 'published' })]);

      await expect(
        service.upsertTranslation(TYPE_ID, VERSION_ID, 'en', {
          name: 'Test',
          description: 'Desc',
        }),
      ).rejects.toThrow('draft');
    });

    it('should throw BadRequestException when version is archived', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([makeVersion({ status: 'archived' })]);

      await expect(
        service.upsertTranslation(TYPE_ID, VERSION_ID, 'en', {
          name: 'Test',
          description: 'Desc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upsert and return the translation for a draft version', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const draftVersion = makeVersion({ status: 'draft' });
      const upsertedTranslation = makeTranslation({
        name: 'Updated Name',
        description: 'Updated Description',
      });

      bundle.selectResults.push([draftVersion]);
      bundle.insertOnConflictDoUpdateMock.mockReturnValueOnce({
        returning: jest.fn().mockResolvedValueOnce([upsertedTranslation]),
      });

      const result = await service.upsertTranslation(
        TYPE_ID,
        VERSION_ID,
        'en',
        {
          name: 'Updated Name',
          description: 'Updated Description',
          schema: { type: 'object' },
          uiSchema: { 'ui:order': ['*'] },
        },
      );

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated Description');
      expect(bundle.insertMock).toHaveBeenCalledTimes(1);
    });

    it('should default schema and uiSchema to empty objects when not provided', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const savedTranslation = makeTranslation({ schema: {}, uiSchema: {} });

      bundle.selectResults.push([makeVersion({ status: 'draft' })]);
      bundle.insertOnConflictDoUpdateMock.mockReturnValueOnce({
        returning: jest.fn().mockResolvedValueOnce([savedTranslation]),
      });

      await service.upsertTranslation(TYPE_ID, VERSION_ID, 'fr', {
        name: 'French Name',
        description: 'French Description',
      });

      const insertedValues = bundle.insertValuesMock.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(insertedValues.schema).toEqual({});
      expect(insertedValues.uiSchema).toEqual({});
      expect(insertedValues.locale).toBe('fr');
    });
  });

  // -------------------------------------------------------------------------
  // publishVersion
  // -------------------------------------------------------------------------

  describe('publishVersion', () => {
    it('should throw NotFoundException when version does not exist', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([]);

      await expect(
        service.publishVersion(TYPE_ID, 'nonexistent-ver'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when version is already published', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([makeVersion({ status: 'published' })]);

      await expect(service.publishVersion(TYPE_ID, VERSION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include "draft" in the BadRequestException when version is not in draft status', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([makeVersion({ status: 'archived' })]);

      await expect(service.publishVersion(TYPE_ID, VERSION_ID)).rejects.toThrow(
        'draft',
      );
    });

    it('should throw BadRequestException when no translations exist', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([makeVersion({ status: 'draft' })]);
      bundle.txSelectResults.push([]); // no translations

      await expect(service.publishVersion(TYPE_ID, VERSION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include "translation" in the BadRequestException when translations are missing', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([makeVersion({ status: 'draft' })]);
      bundle.txSelectResults.push([]);

      await expect(service.publishVersion(TYPE_ID, VERSION_ID)).rejects.toThrow(
        'translation',
      );
    });

    it('should archive the previously published version when one exists', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const previousPublishedVersionId = 'cdtv-prev-pub-001';
      const typeWithPrevPublished = makeType({
        publishedConsentDocumentTypeVersionId: previousPublishedVersionId,
      });
      const publishedResult = makeVersion({
        id: VERSION_ID,
        status: 'published',
      });

      bundle.txSelectResults.push([makeVersion({ status: 'draft' })]);
      bundle.txSelectResults.push([{ id: TRANSLATION_ID }]);
      bundle.txSelectResults.push([typeWithPrevPublished]);
      bundle.txUpdateReturningMock.mockResolvedValueOnce([publishedResult]);

      await service.publishVersion(TYPE_ID, VERSION_ID);

      // Three updates: archive previous + publish new + update parent FK
      expect(bundle.txUpdateMock).toHaveBeenCalledTimes(3);

      const archiveSetCall = bundle.txUpdateSetMock.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(archiveSetCall.status).toBe('archived');
      expect(archiveSetCall.archivedAt).toBeInstanceOf(Date);
    });

    it('should publish the version and update the parent FK when no prior published version exists', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const typeWithNoPublished = makeType({
        publishedConsentDocumentTypeVersionId: null,
      });
      const publishedResult = makeVersion({
        id: VERSION_ID,
        status: 'published',
        publishedAt: new Date(),
      });

      bundle.txSelectResults.push([makeVersion({ status: 'draft' })]);
      bundle.txSelectResults.push([{ id: TRANSLATION_ID }]);
      bundle.txSelectResults.push([typeWithNoPublished]);
      bundle.txUpdateReturningMock.mockResolvedValueOnce([publishedResult]);

      const result = await service.publishVersion(TYPE_ID, VERSION_ID);

      // Only 2 updates: publish version + update parent FK
      expect(bundle.txUpdateMock).toHaveBeenCalledTimes(2);

      const publishSetCall = bundle.txUpdateSetMock.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(publishSetCall.status).toBe('published');
      expect(publishSetCall.publishedAt).toBeInstanceOf(Date);

      expect(result.id).toBe(VERSION_ID);
      expect(result.status).toBe('published');
    });

    it('should not archive the previous version when its ID matches the version being published', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      // publishedConsentDocumentTypeVersionId === VERSION_ID being published
      const typePointingSelf = makeType({
        publishedConsentDocumentTypeVersionId: VERSION_ID,
      });
      const publishedResult = makeVersion({
        id: VERSION_ID,
        status: 'published',
      });

      bundle.txSelectResults.push([makeVersion({ status: 'draft' })]);
      bundle.txSelectResults.push([{ id: TRANSLATION_ID }]);
      bundle.txSelectResults.push([typePointingSelf]);
      bundle.txUpdateReturningMock.mockResolvedValueOnce([publishedResult]);

      await service.publishVersion(TYPE_ID, VERSION_ID);

      // Only 2 updates: publish + parent FK update (no archive)
      expect(bundle.txUpdateMock).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  describe('delete', () => {
    it('should throw NotFoundException when the consent document type does not exist', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([]);

      await expect(service.delete('nonexistent-type-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include the typeId in the NotFoundException message', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([]);

      await expect(service.delete('ghost-type-abc')).rejects.toThrow(
        'ghost-type-abc',
      );
    });

    it('should delete the type when it exists', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([makeType()]);

      await service.delete(TYPE_ID);

      expect(bundle.deleteMock).toHaveBeenCalledTimes(1);
      expect(bundle.deleteWhereMock).toHaveBeenCalledTimes(1);
    });

    it('should not call delete when type is not found', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.selectResults.push([]);

      try {
        await service.delete(TYPE_ID);
      } catch {
        // expected NotFoundException
      }

      expect(bundle.deleteMock).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // archiveVersion
  // -------------------------------------------------------------------------

  describe('archiveVersion', () => {
    it('should throw NotFoundException when version does not exist', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([]);

      await expect(
        service.archiveVersion(TYPE_ID, 'nonexistent-ver'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include the versionId in the NotFoundException message', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([]);

      await expect(
        service.archiveVersion(TYPE_ID, 'missing-ver-999'),
      ).rejects.toThrow('missing-ver-999');
    });

    it('should throw BadRequestException when version is a draft (not published)', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([makeVersion({ status: 'draft' })]);

      await expect(service.archiveVersion(TYPE_ID, VERSION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include "published" in the BadRequestException message for non-published versions', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([makeVersion({ status: 'draft' })]);

      await expect(service.archiveVersion(TYPE_ID, VERSION_ID)).rejects.toThrow(
        'published',
      );
    });

    it('should throw BadRequestException when version is already archived', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      bundle.txSelectResults.push([makeVersion({ status: 'archived' })]);

      await expect(service.archiveVersion(TYPE_ID, VERSION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should archive the version and null out the parent FK', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const archivedResult = makeVersion({
        id: VERSION_ID,
        status: 'archived',
        archivedAt: new Date(),
      });

      bundle.txSelectResults.push([makeVersion({ status: 'published' })]);
      bundle.txUpdateReturningMock.mockResolvedValueOnce([archivedResult]);

      const result = await service.archiveVersion(TYPE_ID, VERSION_ID);

      expect(bundle.transactionMock).toHaveBeenCalledTimes(1);
      // Two updates: archive version + null out parent FK
      expect(bundle.txUpdateMock).toHaveBeenCalledTimes(2);

      const archiveSetCall = bundle.txUpdateSetMock.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(archiveSetCall.status).toBe('archived');
      expect(archiveSetCall.archivedAt).toBeInstanceOf(Date);

      const nullFkSetCall = bundle.txUpdateSetMock.mock.calls[1][0] as Record<
        string,
        unknown
      >;
      expect(nullFkSetCall.publishedConsentDocumentTypeVersionId).toBeNull();

      expect(result.id).toBe(VERSION_ID);
      expect(result.status).toBe('archived');
    });

    it('should return the archived version record with the archivedAt timestamp', async () => {
      const bundle = createDbMock();
      const service = buildService(bundle);

      const now = new Date('2024-06-15T10:00:00Z');
      const archivedVersion = makeVersion({
        id: VERSION_ID,
        status: 'archived',
        archivedAt: now,
      });

      bundle.txSelectResults.push([makeVersion({ status: 'published' })]);
      bundle.txUpdateReturningMock.mockResolvedValueOnce([archivedVersion]);

      const result = await service.archiveVersion(TYPE_ID, VERSION_ID);

      expect(result.archivedAt).toEqual(now);
    });
  });
});
