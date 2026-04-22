import {
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { type Database } from '@repo/db';
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
    triggerUrl: 'https://n8n.example.com/webhook/trigger',
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
  then: (
    resolve: (v: unknown[]) => unknown,
    reject: (e: unknown) => unknown,
  ) => q.dequeue().then(resolve as (v: unknown) => unknown, reject),
});

const createDbMock = () => {
  const selectQ = makeQueue();
  const insertQ = makeQueue();

  const buildSelectChain = () => {
    const limitNode = jest.fn(() => thenableLeaf(selectQ));
    const whereNode = jest.fn(() =>
      Object.assign({ limit: limitNode }, thenableLeaf(selectQ)),
    );
    const innerJoinNode = jest.fn(() => ({ where: whereNode }));
    const fromNode = jest.fn(() => ({
      where: whereNode,
      innerJoin: innerJoinNode,
    }));
    return { fromNode };
  };

  const selectMock = jest.fn(() => {
    const chain = buildSelectChain();
    return { from: chain.fromNode };
  });

  const insertReturning = jest.fn(() => insertQ.dequeue());
  const insertValues = jest.fn(() => ({ returning: insertReturning }));
  const insertMock = jest.fn(() => ({ values: insertValues }));

  const db = { select: selectMock, insert: insertMock };

  return {
    db,
    enqueueSelect: (...results: unknown[][]) => selectQ.enqueue(...results),
    enqueueInsert: (...results: unknown[][]) => insertQ.enqueue(...results),
    insertValues,
    insertMock,
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildService = (opts?: {
  triggerImpl?: jest.Mock;
}) => {
  const mocks = createDbMock();
  const trigger =
    opts?.triggerImpl ??
    jest.fn().mockResolvedValue({ executionId: '129' });
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
});
