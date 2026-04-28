import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Logger } from '@nestjs/common';
import { AxiosError, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { type ActorReadContext, WorkflowActorClientService } from '../workflow-actor-client.service';

describe('WorkflowActorClientService', () => {
  let service: WorkflowActorClientService;
  let httpService: { get: jest.Mock };
  let configService: { get: jest.Mock };

  const WORKFLOW_API_URL = 'https://workflow.example.com';

  const ctx: ActorReadContext = {
    actorId: 'xzhs52istyggbt6q2jinalncwmirlhg6',
    executionId: '197',
    workflowConfig: {
      apiKey: 'api-key-123',
      tenantId: '11111111-1111-1111-1111-111111111111',
    },
  };

  const mockResponse = (
    status: number,
    data: unknown,
  ): AxiosResponse<unknown> =>
    ({
      status,
      data,
      statusText: '',
      headers: {},
      config: {},
    }) as AxiosResponse<unknown>;

  const validAction = {
    id: 'be485cd1-c77f-473c-9ca1-70d2ce13be15',
    actionType: 'showform',
    payload: {
      formId: 'f409389b-bf5f-4677-95d5-02fdb05c2b5d',
      formAPIKey: '18673b12-8f06-42d8-a694-db2d9ba8fc15',
    },
    callbackUrl:
      'https://dev-chwf-sdg.apps.gold.devops.gov.bc.ca/webhook-waiting/197?signature=abc',
    callbackMethod: 'POST',
    callbackPayloadSpec: { formSubmissionId: 'ABC-EFG-123-456-789' },
    actorId: ctx.actorId,
    actorType: 'user',
    workflowInstanceId: '197',
    workflowId: 'kImTywz4mGvrcCgJ',
    projectId: 'sBm11Jr62dNJwm01',
    status: 'pending',
    priority: 'normal',
    dueDate: null,
    checkIn: null,
    metadata: null,
    createdAt: '2026-04-28T15:57:31.803Z',
    updatedAt: '2026-04-28T15:57:31.803Z',
  };

  const validMessage = {
    id: '7b4844e1-916e-45cb-aaae-145bd2847f57',
    title: 'Thanks for starting your SDG Integration Demo',
    body: 'Welcome User 2 we will email you as your application progresses.',
    actorId: ctx.actorId,
    actorType: 'user',
    workflowInstanceId: '197',
    workflowId: 'kImTywz4mGvrcCgJ',
    projectId: 'sBm11Jr62dNJwm01',
    status: 'active',
    metadata: null,
    createdAt: '2026-04-28T15:57:31.690Z',
    updatedAt: '2026-04-28T15:57:31.690Z',
  };

  beforeEach(() => {
    httpService = { get: jest.fn() };
    configService = {
      get: jest.fn((key: string) =>
        key === 'WORKFLOW_API_URL' ? WORKFLOW_API_URL : undefined,
      ),
    };
    service = new WorkflowActorClientService(
      httpService as unknown as HttpService,
      configService as never,
    );
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchActions — request construction', () => {
    it('builds the URL as {WORKFLOW_API_URL}/rest/custom/v1/actors/{actorId}/actions?workflowInstanceId={executionId}', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [], nextCursor: null })),
      );
      await service.fetchActions(ctx);
      const [url] = httpService.get.mock.calls[0];
      expect(url).toBe(
        `${WORKFLOW_API_URL}/rest/custom/v1/actors/${ctx.actorId}/actions?workflowInstanceId=${ctx.executionId}`,
      );
    });

    it('strips a trailing slash on WORKFLOW_API_URL before concatenating', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'WORKFLOW_API_URL' ? `${WORKFLOW_API_URL}/` : undefined,
      );
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [], nextCursor: null })),
      );
      await service.fetchActions(ctx);
      const [url] = httpService.get.mock.calls[0];
      expect(url.startsWith(`${WORKFLOW_API_URL}/rest/custom/v1/`)).toBe(true);
      expect(url).not.toContain('//rest/');
    });

    it('URL-encodes actorId and executionId', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [], nextCursor: null })),
      );
      await service.fetchActions({
        ...ctx,
        actorId: 'with space',
        executionId: '1/2',
      });
      const [url] = httpService.get.mock.calls[0];
      expect(url).toContain('/actors/with%20space/actions');
      expect(url).toContain('workflowInstanceId=1%2F2');
    });

    it('sends X-N8N-API-KEY from ctx.workflowConfig.apiKey', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [], nextCursor: null })),
      );
      await service.fetchActions(ctx);
      const [, options] = httpService.get.mock.calls[0];
      expect(options.headers['X-N8N-API-KEY']).toBe(ctx.workflowConfig.apiKey);
    });

    it('sends X-TENANT-ID from ctx.workflowConfig.tenantId', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [], nextCursor: null })),
      );
      await service.fetchActions(ctx);
      const [, options] = httpService.get.mock.calls[0];
      expect(options.headers['X-TENANT-ID']).toBe(ctx.workflowConfig.tenantId);
    });

    it('passes timeout: 10_000 to axios', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [], nextCursor: null })),
      );
      await service.fetchActions(ctx);
      const [, options] = httpService.get.mock.calls[0];
      expect(options.timeout).toBe(10_000);
    });

    it('passes validateStatus that always returns true', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [], nextCursor: null })),
      );
      await service.fetchActions(ctx);
      const [, options] = httpService.get.mock.calls[0];
      expect(typeof options.validateStatus).toBe('function');
      expect(options.validateStatus(0)).toBe(true);
      expect(options.validateStatus(500)).toBe(true);
    });
  });

  describe('fetchActions — response parsing', () => {
    it('returns the parsed { items, nextCursor } envelope on a 200 with a valid upstream body', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [validAction], nextCursor: null })),
      );
      const result = await service.fetchActions(ctx);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(validAction.id);
      expect(result.nextCursor).toBeNull();
    });

    it('accepts nextCursor: null', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [], nextCursor: null })),
      );
      const result = await service.fetchActions(ctx);
      expect(result.nextCursor).toBeNull();
    });

    it('accepts nextCursor: <string>', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [], nextCursor: 'cursor-abc' })),
      );
      const result = await service.fetchActions(ctx);
      expect(result.nextCursor).toBe('cursor-abc');
    });

    it('accepts items: [] (empty list is valid)', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [], nextCursor: null })),
      );
      const result = await service.fetchActions(ctx);
      expect(result.items).toEqual([]);
    });

    it('parses an action with the example "showform" payload from the doc', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [validAction], nextCursor: null })),
      );
      const result = await service.fetchActions(ctx);
      const action = result.items[0];
      expect(action.actionType).toBe('showform');
      expect(action.payload).toEqual({
        formId: 'f409389b-bf5f-4677-95d5-02fdb05c2b5d',
        formAPIKey: '18673b12-8f06-42d8-a694-db2d9ba8fc15',
      });
      expect(action.callbackMethod).toBe('POST');
      expect(action.status).toBe('pending');
      expect(action.priority).toBe('normal');
      expect(action.metadata).toBeNull();
    });
  });

  describe('fetchActions — error mapping', () => {
    it('throws BadGatewayException on network error', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new AxiosError('Network error')),
      );
      await expect(service.fetchActions(ctx)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException on a non-2xx status (e.g. 500)', async () => {
      httpService.get.mockReturnValue(of(mockResponse(500, {})));
      await expect(service.fetchActions(ctx)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException when the body is not an object', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, 'not-json')));
      await expect(service.fetchActions(ctx)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException when the envelope is missing items[]', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { nextCursor: null })),
      );
      await expect(service.fetchActions(ctx)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException when an action has an unknown status enum value', async () => {
      httpService.get.mockReturnValue(
        of(
          mockResponse(200, {
            items: [{ ...validAction, status: 'something-new' }],
            nextCursor: null,
          }),
        ),
      );
      await expect(service.fetchActions(ctx)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException when an action has an unknown callbackMethod', async () => {
      httpService.get.mockReturnValue(
        of(
          mockResponse(200, {
            items: [{ ...validAction, callbackMethod: 'GET' }],
            nextCursor: null,
          }),
        ),
      );
      await expect(service.fetchActions(ctx)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('does not leak apiKey or tenantId in the BadGatewayException message', async () => {
      httpService.get.mockReturnValue(of(mockResponse(500, {})));
      await expect(service.fetchActions(ctx)).rejects.toMatchObject({
        message: expect.not.stringContaining(ctx.workflowConfig.apiKey),
      });
      await expect(service.fetchActions(ctx)).rejects.toMatchObject({
        message: expect.not.stringContaining(ctx.workflowConfig.tenantId),
      });
    });
  });

  describe('fetchMessages — request construction', () => {
    it('builds the URL as {WORKFLOW_API_URL}/rest/custom/v1/actors/{actorId}/messages?workflowInstanceId={executionId}', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, [])));
      await service.fetchMessages(ctx);
      const [url] = httpService.get.mock.calls[0];
      expect(url).toBe(
        `${WORKFLOW_API_URL}/rest/custom/v1/actors/${ctx.actorId}/messages?workflowInstanceId=${ctx.executionId}`,
      );
    });

    it('sends the same X-N8N-API-KEY + X-TENANT-ID headers as fetchActions', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, [])));
      await service.fetchMessages(ctx);
      const [, options] = httpService.get.mock.calls[0];
      expect(options.headers['X-N8N-API-KEY']).toBe(ctx.workflowConfig.apiKey);
      expect(options.headers['X-TENANT-ID']).toBe(ctx.workflowConfig.tenantId);
    });

    it('passes timeout: 10_000 and validateStatus: () => true', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, [])));
      await service.fetchMessages(ctx);
      const [, options] = httpService.get.mock.calls[0];
      expect(options.timeout).toBe(10_000);
      expect(typeof options.validateStatus).toBe('function');
      expect(options.validateStatus(500)).toBe(true);
    });
  });

  describe('fetchMessages — response wrapping', () => {
    it('wraps the upstream bare array into { items: [...] } on success', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, [validMessage])));
      const result = await service.fetchMessages(ctx);
      expect(result).toEqual({ items: [validMessage] });
    });

    it('returns { items: [] } when the upstream array is empty', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, [])));
      const result = await service.fetchMessages(ctx);
      expect(result).toEqual({ items: [] });
    });

    it('parses a message with the example shape from the doc (status: "active", metadata: null)', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, [validMessage])));
      const result = await service.fetchMessages(ctx);
      const message = result.items[0];
      expect(message.status).toBe('active');
      expect(message.metadata).toBeNull();
      expect(message.title).toBe(validMessage.title);
      expect(message.body).toBe(validMessage.body);
    });
  });

  describe('fetchMessages — error mapping', () => {
    it('throws BadGatewayException on network error', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new AxiosError('Network error')),
      );
      await expect(service.fetchMessages(ctx)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException on a non-2xx status (e.g. 500)', async () => {
      httpService.get.mockReturnValue(of(mockResponse(500, [])));
      await expect(service.fetchMessages(ctx)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException when the upstream returns an object instead of an array', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { items: [validMessage] })),
      );
      await expect(service.fetchMessages(ctx)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException when a message has an unknown status enum value', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, [{ ...validMessage, status: 'unknown' }])),
      );
      await expect(service.fetchMessages(ctx)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });
});
