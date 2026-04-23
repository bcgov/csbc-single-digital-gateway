import {
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

jest.mock('@repo/db', () => {
  const actual = jest.requireActual('@repo/db');
  return {
    ...actual,
    eq: jest.fn((col: unknown, val: unknown) => ({ _op: 'eq', col, val })),
    and: jest.fn((...conds: unknown[]) => ({
      _op: 'and',
      conds: conds.filter(Boolean),
    })),
    desc: jest.fn((col: unknown) => ({ _op: 'desc', col })),
    inArray: jest.fn((col: unknown, vals: unknown) => ({
      _op: 'inArray',
      col,
      vals,
    })),
  };
});

import { type Database, schema } from '@repo/db';
import { ApplicationsService, type SubmitActor } from '../applications.service';
import { WorkflowTriggerService } from '../workflow-trigger.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SERVICE_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';
const TRANSLATION_ID_EN = '33333333-3333-4333-8333-333333333333';
const TRANSLATION_ID_FR = '44444444-4444-4444-8444-444444444444';
const APP_ID_EXTERNAL = '55555555-5555-4555-8555-555555555555';
const APP_ID_WORKFLOW = '66666666-6666-4666-8666-666666666666';
const USER_ID = '77777777-7777-4777-8777-777777777777';
const TENANT_ID = '88888888-8888-4888-8888-888888888888';
const UNKNOWN_APP_ID = '99999999-9999-4999-8999-999999999999';

const EXTERNAL_APP = {
  id: APP_ID_EXTERNAL,
  label: 'Apply Online',
  type: 'external',
};

const WORKFLOW_APP = {
  id: APP_ID_WORKFLOW,
  label: 'Guided Application',
  type: 'workflow',
  config: {
    apiKey: 'api-key-xyz',
    tenantId: TENANT_ID,
    triggerEndpoint: '/webhook/trigger',
  },
};

const baseContent = (apps: unknown[] = [EXTERNAL_APP, WORKFLOW_APP]) => ({
  applications: apps,
  contactMethods: [],
  consents: [],
  resources: {
    legal: [],
    otherServices: { recommendedServices: [], relatedServices: [] },
    recommendedReading: [],
  },
});

const makeTranslation = (
  locale: string,
  id: string,
  content: unknown = baseContent(),
) => ({
  id,
  serviceVersionId: VERSION_ID,
  locale,
  name: 'My Service',
  description: null,
  content,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const baseProfile = (overrides: Partial<SubmitActor> = {}): SubmitActor => ({
  sub: 'abc123@bcsc',
  name: 'Jane Doe',
  given_name: 'Jane',
  family_name: 'Doe',
  ...overrides,
});

const submitArgs = (overrides: Record<string, unknown> = {}) => ({
  serviceId: SERVICE_ID,
  versionId: VERSION_ID,
  applicationId: APP_ID_EXTERNAL,
  locale: 'en',
  userId: USER_ID,
  profile: baseProfile(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// DB mock
// ---------------------------------------------------------------------------

type Queue = unknown[][];

const makeQueue = () => {
  const q: Queue = [];
  return {
    enqueue: (...items: unknown[][]) => items.forEach((v) => q.push(v)),
    dequeue: (): Promise<unknown[]> => {
      if (q.length === 0) {
        throw new Error('Queue empty — enqueue a result for this DB call');
      }
      return Promise.resolve(q.shift()!);
    },
  };
};

const thenableLeaf = (q: ReturnType<typeof makeQueue>) => ({
  then: (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
    q.dequeue().then(resolve as (v: unknown) => unknown, reject),
});

const createDbMock = () => {
  const selectQ = makeQueue();
  const insertQ = makeQueue();

  const offsetNode = jest.fn((..._args: unknown[]) => thenableLeaf(selectQ));
  const limitNode = jest.fn((..._args: unknown[]) =>
    Object.assign({ offset: offsetNode }, thenableLeaf(selectQ)),
  );
  const orderByNode = jest.fn((..._args: unknown[]) =>
    Object.assign(
      { limit: limitNode, offset: offsetNode },
      thenableLeaf(selectQ),
    ),
  );
  const whereNode = jest.fn((..._args: unknown[]) =>
    Object.assign(
      { limit: limitNode, orderBy: orderByNode, offset: offsetNode },
      thenableLeaf(selectQ),
    ),
  );
  const innerJoinNode = jest.fn((..._args: unknown[]) => ({
    where: whereNode,
  }));
  const fromNode = jest.fn((..._args: unknown[]) => ({
    where: whereNode,
    innerJoin: innerJoinNode,
  }));

  const selectMock = jest.fn((..._args: unknown[]) => ({ from: fromNode }));

  const insertReturning = jest.fn(() => insertQ.dequeue());
  const insertValues = jest.fn(() => ({ returning: insertReturning }));
  const insertMock = jest.fn(() => ({ values: insertValues }));

  const db = { select: selectMock, insert: insertMock };

  return {
    db,
    enqueueSelect: (...results: unknown[][]) => selectQ.enqueue(...results),
    enqueueInsert: (...results: unknown[][]) => insertQ.enqueue(...results),
    selectMock,
    fromNode,
    whereNode,
    orderByNode,
    limitNode,
    offsetNode,
    insertValues,
    insertMock,
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildService = (opts?: { triggerImpl?: jest.Mock }) => {
  const mocks = createDbMock();
  const trigger =
    opts?.triggerImpl ?? jest.fn().mockResolvedValue({ executionId: '129' });
  const workflowTrigger = { trigger } as unknown as WorkflowTriggerService;
  const service = new ApplicationsService(
    mocks.db as unknown as Database,
    workflowTrigger,
  );
  return { service, mocks, trigger };
};

const enqueueHappyPath = (
  mocks: ReturnType<typeof createDbMock>,
  opts: {
    versionStatus?: 'published' | 'archived';
    translations?: ReturnType<typeof makeTranslation>[];
    insertedRow?: Record<string, unknown>;
  } = {},
) => {
  mocks.enqueueSelect([
    { id: VERSION_ID, status: opts.versionStatus ?? 'published' },
  ]);
  mocks.enqueueSelect(
    opts.translations ?? [makeTranslation('en', TRANSLATION_ID_EN)],
  );
  if (opts.insertedRow !== undefined) {
    mocks.enqueueInsert([opts.insertedRow]);
  } else {
    mocks.enqueueInsert([
      {
        id: 'row-1',
        serviceId: SERVICE_ID,
        serviceVersionId: VERSION_ID,
        serviceVersionTranslationId: TRANSLATION_ID_EN,
        serviceApplicationId: APP_ID_EXTERNAL,
        serviceApplicationType: 'external',
        userId: USER_ID,
        delegateUserId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  }
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ApplicationsService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('submit — validation', () => {
    it('should throw NotFoundException when the service does not exist', async () => {
      const { service, mocks } = buildService();
      mocks.enqueueSelect([]); // version query returns empty
      await expect(service.submit(submitArgs())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when the version does not exist', async () => {
      const { service, mocks } = buildService();
      mocks.enqueueSelect([]);
      await expect(service.submit(submitArgs())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when the version belongs to a different service', async () => {
      const { service, mocks } = buildService();
      // Join on serviceId filter → no matching rows
      mocks.enqueueSelect([]);
      await expect(service.submit(submitArgs())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when the version status is "draft" (filter rejects)', async () => {
      const { service, mocks } = buildService();
      // The IN('published','archived') clause makes draft versions return 0 rows
      mocks.enqueueSelect([]);
      await expect(service.submit(submitArgs())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should allow submission against a "published" version', async () => {
      const { service, mocks } = buildService();
      enqueueHappyPath(mocks, { versionStatus: 'published' });
      const result = await service.submit(submitArgs());
      expect(result.serviceApplicationType).toBe('external');
    });

    it('should allow submission against an "archived" version', async () => {
      const { service, mocks } = buildService();
      enqueueHappyPath(mocks, { versionStatus: 'archived' });
      const result = await service.submit(submitArgs());
      expect(result.serviceApplicationType).toBe('external');
    });
  });

  describe('submit — locale resolution', () => {
    it('should use the requested locale translation when present', async () => {
      const { service, mocks } = buildService();
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([
        makeTranslation('fr', TRANSLATION_ID_FR),
        makeTranslation('en', TRANSLATION_ID_EN),
      ]);
      mocks.enqueueInsert([
        {
          id: 'row-1',
          serviceVersionTranslationId: TRANSLATION_ID_FR,
          serviceApplicationType: 'external',
        },
      ]);

      await service.submit(submitArgs({ locale: 'fr' }));

      expect(mocks.insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceVersionTranslationId: TRANSLATION_ID_FR,
        }),
      );
    });

    it('should fall back to the "en" translation when the requested locale has no translation', async () => {
      const { service, mocks } = buildService();
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);
      mocks.enqueueInsert([
        {
          id: 'row-1',
          serviceVersionTranslationId: TRANSLATION_ID_EN,
          serviceApplicationType: 'external',
        },
      ]);

      await service.submit(submitArgs({ locale: 'fr' }));

      expect(mocks.insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceVersionTranslationId: TRANSLATION_ID_EN,
        }),
      );
    });

    it('should throw NotFoundException when neither the requested locale nor "en" has a translation', async () => {
      const { service, mocks } = buildService();
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([]);

      await expect(
        service.submit(submitArgs({ locale: 'fr' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should record the serviceVersionTranslationId of the translation actually used (fallback case)', async () => {
      const { service, mocks } = buildService();
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);
      mocks.enqueueInsert([
        {
          id: 'row-1',
          serviceVersionTranslationId: TRANSLATION_ID_EN,
          serviceApplicationType: 'external',
        },
      ]);

      await service.submit(submitArgs({ locale: 'de' }));

      const call = mocks.insertValues.mock.calls[0] as unknown[];
      const inserted = call[0] as Record<string, unknown>;
      expect(inserted.serviceVersionTranslationId).toBe(TRANSLATION_ID_EN);
    });
  });

  describe('submit — serviceApplicationId resolution', () => {
    it('should throw NotFoundException when :applicationId is not present in content.applications[]', async () => {
      const { service, mocks } = buildService();
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);

      await expect(
        service.submit(
          submitArgs({
            applicationId: UNKNOWN_APP_ID,
          }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw NotFoundException when content.applications is absent or not an array', async () => {
      const { service, mocks } = buildService();
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([
        makeTranslation('en', TRANSLATION_ID_EN, { notApplications: 'nope' }),
      ]);

      await expect(service.submit(submitArgs())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('submit — external type', () => {
    it('should insert an applications row with serviceApplicationType="external" and metadata={}', async () => {
      const { service, mocks } = buildService();
      enqueueHappyPath(mocks);

      await service.submit(submitArgs());

      expect(mocks.insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceApplicationType: 'external',
          metadata: {},
        }),
      );
    });

    it('should not invoke WorkflowTriggerService for external type', async () => {
      const { service, mocks, trigger } = buildService();
      enqueueHappyPath(mocks);

      await service.submit(submitArgs());

      expect(trigger).not.toHaveBeenCalled();
    });

    it('should populate userId from the caller and leave delegateUserId null', async () => {
      const { service, mocks } = buildService();
      enqueueHappyPath(mocks);

      await service.submit(submitArgs());

      expect(mocks.insertValues).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, delegateUserId: null }),
      );
    });

    it('should return the full inserted row', async () => {
      const { service, mocks } = buildService();
      const row = {
        id: 'row-1',
        serviceId: SERVICE_ID,
        serviceVersionId: VERSION_ID,
        serviceVersionTranslationId: TRANSLATION_ID_EN,
        serviceApplicationId: APP_ID_EXTERNAL,
        serviceApplicationType: 'external',
        userId: USER_ID,
        delegateUserId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      enqueueHappyPath(mocks, { insertedRow: row });

      const result = await service.submit(submitArgs());

      expect(result).toEqual(row);
    });
  });

  describe('submit — workflow type', () => {
    it('should call WorkflowTriggerService.trigger with the dto config and derived actor', async () => {
      const { service, mocks, trigger } = buildService();
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);
      mocks.enqueueInsert([{ id: 'row-1' }]);

      await service.submit(submitArgs({ applicationId: APP_ID_WORKFLOW }));

      expect(trigger).toHaveBeenCalledWith(WORKFLOW_APP.config, {
        actorId: 'abc123',
        actorType: 'user',
        displayName: 'Jane Doe',
      });
    });

    it('should insert a row with serviceApplicationType="workflow" and metadata={ executionId, submissionIds: [] } on success', async () => {
      const { service, mocks } = buildService({
        triggerImpl: jest.fn().mockResolvedValue({ executionId: '129' }),
      });
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);
      mocks.enqueueInsert([{ id: 'row-1' }]);

      await service.submit(submitArgs({ applicationId: APP_ID_WORKFLOW }));

      expect(mocks.insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceApplicationType: 'workflow',
          metadata: { executionId: '129', submissionIds: [] },
        }),
      );
    });

    it('should NOT insert a row when WorkflowTriggerService.trigger rejects', async () => {
      const { service, mocks } = buildService({
        triggerImpl: jest.fn().mockRejectedValue(new Error('trigger failed')),
      });
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);

      await expect(
        service.submit(submitArgs({ applicationId: APP_ID_WORKFLOW })),
      ).rejects.toThrow('trigger failed');

      expect(mocks.insertMock).not.toHaveBeenCalled();
    });

    it('should call trigger BEFORE the INSERT', async () => {
      const order: string[] = [];
      const { service, mocks } = buildService({
        triggerImpl: jest.fn(async () => {
          order.push('trigger');
          return { executionId: '129' };
        }),
      });
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);
      mocks.insertMock.mockImplementationOnce((() => {
        order.push('insert');
        return {
          values: () => ({ returning: () => Promise.resolve([{}]) }),
        };
      }) as never);

      await service.submit(submitArgs({ applicationId: APP_ID_WORKFLOW }));

      expect(order).toEqual(['trigger', 'insert']);
    });

    it('should throw InternalServerErrorException when INSERT fails after successful workflow trigger', async () => {
      const { service, mocks } = buildService({
        triggerImpl: jest.fn().mockResolvedValue({ executionId: '129' }),
      });
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);
      mocks.insertMock.mockImplementationOnce((() => ({
        values: () => ({
          returning: () => Promise.reject(new Error('DB down')),
        }),
      })) as never);

      await expect(
        service.submit(submitArgs({ applicationId: APP_ID_WORKFLOW })),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('submit — actor derivation', () => {
    it('should compute actorId as the portion of userProfile.sub before the first "@"', async () => {
      const { service, mocks, trigger } = buildService();
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);
      mocks.enqueueInsert([{ id: 'row-1' }]);

      await service.submit(
        submitArgs({
          applicationId: APP_ID_WORKFLOW,
          profile: baseProfile({ sub: 'abc123@bcsc-prod' }),
        }),
      );

      const call = trigger.mock.calls[0][1];
      expect(call.actorId).toBe('abc123');
    });

    it('should use userProfile.name when present', async () => {
      const { service, mocks, trigger } = buildService();
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);
      mocks.enqueueInsert([{ id: 'row-1' }]);

      await service.submit(
        submitArgs({
          applicationId: APP_ID_WORKFLOW,
          profile: baseProfile({ name: 'Jane Q. Doe' }),
        }),
      );

      const call = trigger.mock.calls[0][1];
      expect(call.displayName).toBe('Jane Q. Doe');
    });

    it('should fall back to "{given_name} {family_name}" when name is missing', async () => {
      const { service, mocks, trigger } = buildService();
      mocks.enqueueSelect([{ id: VERSION_ID, status: 'published' }]);
      mocks.enqueueSelect([makeTranslation('en', TRANSLATION_ID_EN)]);
      mocks.enqueueInsert([{ id: 'row-1' }]);

      await service.submit(
        submitArgs({
          applicationId: APP_ID_WORKFLOW,
          profile: baseProfile({
            name: undefined,
            given_name: 'Jane',
            family_name: 'Doe',
          }),
        }),
      );

      const call = trigger.mock.calls[0][1];
      expect(call.displayName).toBe('Jane Doe');
    });
  });

  describe('listForUser', () => {
    const makeRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
      id: 'row-1',
      serviceId: SERVICE_ID,
      serviceVersionId: VERSION_ID,
      serviceVersionTranslationId: TRANSLATION_ID_EN,
      serviceApplicationId: APP_ID_EXTERNAL,
      serviceApplicationType: 'external',
      userId: USER_ID,
      delegateUserId: null,
      metadata: {},
      createdAt: new Date('2026-04-22T12:00:00Z'),
      updatedAt: new Date('2026-04-22T12:00:00Z'),
      ...overrides,
    });

    const warnSpy = () =>
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    describe('filtering', () => {
      it('should filter by userId only when no serviceId is passed', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]); // data rows
        mocks.enqueueSelect([{ count: 0 }]); // count

        await service.listForUser({ userId: USER_ID, page: 1, limit: 20 });

        const dataWhereArg = mocks.whereNode.mock.calls[0][0] as {
          _op: string;
          conds: { _op: string; col: unknown; val: unknown }[];
        };
        expect(dataWhereArg._op).toBe('and');
        expect(dataWhereArg.conds).toHaveLength(1);
        expect(dataWhereArg.conds[0]).toEqual({
          _op: 'eq',
          col: schema.applications.userId,
          val: USER_ID,
        });
      });

      it('should additionally filter by serviceId when one is passed', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]);
        mocks.enqueueSelect([{ count: 0 }]);

        await service.listForUser({
          userId: USER_ID,
          serviceId: SERVICE_ID,
          page: 1,
          limit: 20,
        });

        const dataWhereArg = mocks.whereNode.mock.calls[0][0] as {
          _op: string;
          conds: { _op: string; col: unknown; val: unknown }[];
        };
        expect(dataWhereArg.conds).toHaveLength(2);
        expect(dataWhereArg.conds).toEqual(
          expect.arrayContaining([
            {
              _op: 'eq',
              col: schema.applications.userId,
              val: USER_ID,
            },
            {
              _op: 'eq',
              col: schema.applications.serviceId,
              val: SERVICE_ID,
            },
          ]),
        );
      });

      it('should apply the same filter to both the data query and the count query', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]);
        mocks.enqueueSelect([{ count: 0 }]);

        await service.listForUser({
          userId: USER_ID,
          serviceId: SERVICE_ID,
          page: 1,
          limit: 20,
        });

        const dataWhere = mocks.whereNode.mock.calls[0][0];
        const countWhere = mocks.whereNode.mock.calls[1][0];
        expect(countWhere).toEqual(dataWhere);
      });

      it('should NOT include rows where the session user is only the delegate (delegateUserId)', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]);
        mocks.enqueueSelect([{ count: 0 }]);

        await service.listForUser({ userId: USER_ID, page: 1, limit: 20 });

        const dataWhereArg = mocks.whereNode.mock.calls[0][0] as {
          _op: string;
          conds: { _op: string; col: unknown; val: unknown }[];
        };
        const delegateCondition = dataWhereArg.conds.find(
          (c) => c.col === schema.applications.delegateUserId,
        );
        expect(delegateCondition).toBeUndefined();
      });
    });

    describe('ordering', () => {
      it('should order by createdAt DESC with id DESC as a stable tiebreaker', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]);
        mocks.enqueueSelect([{ count: 0 }]);

        await service.listForUser({ userId: USER_ID, page: 1, limit: 20 });

        expect(mocks.orderByNode).toHaveBeenCalledTimes(1);
        const args = mocks.orderByNode.mock.calls[0];
        expect(args).toHaveLength(2);
        expect(args[0]).toEqual({
          _op: 'desc',
          col: schema.applications.createdAt,
        });
        expect(args[1]).toEqual({
          _op: 'desc',
          col: schema.applications.id,
        });
      });
    });

    describe('pagination', () => {
      it('should apply LIMIT=limit and OFFSET=0 for page=1', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]);
        mocks.enqueueSelect([{ count: 0 }]);

        await service.listForUser({ userId: USER_ID, page: 1, limit: 20 });

        expect(mocks.limitNode).toHaveBeenCalledWith(20);
        expect(mocks.offsetNode).toHaveBeenCalledWith(0);
      });

      it('should apply LIMIT=10 and OFFSET=20 for page=3, limit=10', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]);
        mocks.enqueueSelect([{ count: 0 }]);

        await service.listForUser({ userId: USER_ID, page: 3, limit: 10 });

        expect(mocks.limitNode).toHaveBeenCalledWith(10);
        expect(mocks.offsetNode).toHaveBeenCalledWith(20);
      });

      it('should return total from a separate COUNT(*) query', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]);
        mocks.enqueueSelect([{ count: 42 }]);

        const result = await service.listForUser({
          userId: USER_ID,
          page: 1,
          limit: 20,
        });

        expect(result.total).toBe(42);
        // Two select() invocations when there are zero rows (data + count)
        expect(mocks.selectMock).toHaveBeenCalledTimes(2);
      });

      it('should return the page and limit supplied by the caller in the response envelope', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]);
        mocks.enqueueSelect([{ count: 0 }]);

        const result = await service.listForUser({
          userId: USER_ID,
          page: 3,
          limit: 7,
        });

        expect(result.page).toBe(3);
        expect(result.limit).toBe(7);
      });
    });

    describe('enrichment', () => {
      it('should enrich each row with serviceTitle and serviceApplicationTitle from the translation snapshot', async () => {
        const { service, mocks } = buildService();
        const row = makeRow();
        mocks.enqueueSelect([row]);
        mocks.enqueueSelect([{ count: 1 }]);
        mocks.enqueueSelect([
          {
            id: TRANSLATION_ID_EN,
            name: 'Small Business Grant',
            content: baseContent(),
          },
        ]);

        const result = await service.listForUser({
          userId: USER_ID,
          page: 1,
          limit: 20,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].serviceTitle).toBe('Small Business Grant');
        expect(result.items[0].serviceApplicationTitle).toBe('Apply Online');
      });

      it('should emit empty enrichment and a logger.warn when the translation row is missing', async () => {
        const warn = warnSpy();
        const { service, mocks } = buildService();
        const row = makeRow();
        mocks.enqueueSelect([row]);
        mocks.enqueueSelect([{ count: 1 }]);
        mocks.enqueueSelect([]); // no translation returned

        const result = await service.listForUser({
          userId: USER_ID,
          page: 1,
          limit: 20,
        });

        expect(result.items[0].serviceTitle).toBe('');
        expect(result.items[0].serviceApplicationTitle).toBe('');
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('row-1');
      });

      it('should emit empty enrichment and a logger.warn when translation.content fails ServiceContentSchema.safeParse', async () => {
        const warn = warnSpy();
        const { service, mocks } = buildService();
        const row = makeRow();
        mocks.enqueueSelect([row]);
        mocks.enqueueSelect([{ count: 1 }]);
        mocks.enqueueSelect([
          {
            id: TRANSLATION_ID_EN,
            name: 'Some Title',
            content: { notApplications: 'nope' },
          },
        ]);

        const result = await service.listForUser({
          userId: USER_ID,
          page: 1,
          limit: 20,
        });

        expect(result.items[0].serviceTitle).toBe('');
        expect(result.items[0].serviceApplicationTitle).toBe('');
        expect(warn).toHaveBeenCalledTimes(1);
      });

      it('should emit empty enrichment and a logger.warn when the serviceApplicationId is not in content.applications[]', async () => {
        const warn = warnSpy();
        const { service, mocks } = buildService();
        const row = makeRow({ serviceApplicationId: UNKNOWN_APP_ID });
        mocks.enqueueSelect([row]);
        mocks.enqueueSelect([{ count: 1 }]);
        mocks.enqueueSelect([
          {
            id: TRANSLATION_ID_EN,
            name: 'Some Title',
            content: baseContent(),
          },
        ]);

        const result = await service.listForUser({
          userId: USER_ID,
          page: 1,
          limit: 20,
        });

        expect(result.items[0].serviceTitle).toBe('');
        expect(result.items[0].serviceApplicationTitle).toBe('');
        expect(warn).toHaveBeenCalledTimes(1);
      });

      it('should NOT drop a row from the result set when enrichment fails', async () => {
        warnSpy();
        const { service, mocks } = buildService();
        const rowOk = makeRow({ id: 'row-ok' });
        const rowBad = makeRow({
          id: 'row-bad',
          serviceVersionTranslationId: TRANSLATION_ID_FR,
        });
        mocks.enqueueSelect([rowOk, rowBad]);
        mocks.enqueueSelect([{ count: 2 }]);
        // Only the 'en' translation is returned — 'fr' (rowBad) is missing
        mocks.enqueueSelect([
          {
            id: TRANSLATION_ID_EN,
            name: 'OK Title',
            content: baseContent(),
          },
        ]);

        const result = await service.listForUser({
          userId: USER_ID,
          page: 1,
          limit: 20,
        });

        expect(result.items).toHaveLength(2);
        const okItem = result.items.find((i) => i.id === 'row-ok')!;
        const badItem = result.items.find((i) => i.id === 'row-bad')!;
        expect(okItem.serviceTitle).toBe('OK Title');
        expect(badItem.serviceTitle).toBe('');
      });
    });

    describe('empty result', () => {
      it('should return { items: [], total: 0, page, limit } when no rows match (never 404)', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]);
        mocks.enqueueSelect([{ count: 0 }]);

        const result = await service.listForUser({
          userId: USER_ID,
          page: 2,
          limit: 50,
        });

        expect(result).toEqual({
          items: [],
          total: 0,
          page: 2,
          limit: 50,
        });
      });

      it('should NOT run the translations query when there are zero rows', async () => {
        const { service, mocks } = buildService();
        mocks.enqueueSelect([]);
        mocks.enqueueSelect([{ count: 0 }]);

        await service.listForUser({ userId: USER_ID, page: 1, limit: 20 });

        // Only two selects: data + count. No translation query.
        expect(mocks.selectMock).toHaveBeenCalledTimes(2);
      });
    });
  });
});
