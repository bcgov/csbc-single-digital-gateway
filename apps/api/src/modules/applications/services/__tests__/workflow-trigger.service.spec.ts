import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Logger } from '@nestjs/common';
import { AxiosError, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { WorkflowTriggerService } from '../workflow-trigger.service';

describe('WorkflowTriggerService', () => {
  let service: WorkflowTriggerService;
  let httpService: { post: jest.Mock };
  let configService: { get: jest.Mock };

  const WORKFLOW_API_URL = 'https://n8n.example.com';

  const config = {
    apiKey: 'api-key-123',
    tenantId: '11111111-1111-1111-1111-111111111111',
    triggerEndpoint: '/webhook/trigger',
  };

  const expectedUrl = `${WORKFLOW_API_URL}${config.triggerEndpoint}`;

  const actor = {
    actorId: 'abc123',
    actorType: 'user' as const,
    displayName: 'Jane Doe',
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

  beforeEach(() => {
    httpService = { post: jest.fn() };
    configService = {
      get: jest.fn((key: string) =>
        key === 'WORKFLOW_API_URL' ? WORKFLOW_API_URL : undefined,
      ),
    };
    service = new WorkflowTriggerService(
      httpService as unknown as HttpService,
      configService as never,
    );
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('trigger — request construction', () => {
    it('should POST to WORKFLOW_API_URL + config.triggerEndpoint', async () => {
      httpService.post.mockReturnValue(
        of(mockResponse(200, { WorkflowInstance: '129' })),
      );
      await service.trigger(config, actor);
      expect(httpService.post).toHaveBeenCalledWith(
        expectedUrl,
        expect.anything(),
        expect.anything(),
      );
    });

    it('should send X-N8N-API-KEY header with config.apiKey', async () => {
      httpService.post.mockReturnValue(
        of(mockResponse(200, { WorkflowInstance: '129' })),
      );
      await service.trigger(config, actor);
      const [, , options] = httpService.post.mock.calls[0];
      expect(options.headers['X-N8N-API-KEY']).toBe(config.apiKey);
    });

    it('should send X-TENANT-ID header with config.tenantId', async () => {
      httpService.post.mockReturnValue(
        of(mockResponse(200, { WorkflowInstance: '129' })),
      );
      await service.trigger(config, actor);
      const [, , options] = httpService.post.mock.calls[0];
      expect(options.headers['X-TENANT-ID']).toBe(config.tenantId);
    });

    it('should send Content-Type: application/json', async () => {
      httpService.post.mockReturnValue(
        of(mockResponse(200, { WorkflowInstance: '129' })),
      );
      await service.trigger(config, actor);
      const [, , options] = httpService.post.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('should send body { actorId, actorType: "user", displayName }', async () => {
      httpService.post.mockReturnValue(
        of(mockResponse(200, { WorkflowInstance: '129' })),
      );
      await service.trigger(config, actor);
      const [, body] = httpService.post.mock.calls[0];
      expect(body).toEqual({
        actorId: 'abc123',
        actorType: 'user',
        displayName: 'Jane Doe',
      });
    });
  });

  describe('trigger — response parsing', () => {
    it('should return the WorkflowInstance value as executionId and the WorkflowId on 2xx with valid body', async () => {
      httpService.post.mockReturnValue(
        of(
          mockResponse(200, {
            WorkflowId: 'kImTywz4mGvrcCgJ',
            WorkflowName: 'SDG Integration Demo',
            WorkflowInstance: '129',
          }),
        ),
      );
      const result = await service.trigger(config, actor);
      expect(result).toEqual({
        workflowId: 'kImTywz4mGvrcCgJ',
        executionId: '129',
      });
    });

    it('should accept any 2xx status code (200, 201, 202)', async () => {
      for (const status of [200, 201, 202]) {
        httpService.post.mockReturnValueOnce(
          of(mockResponse(status, { WorkflowInstance: '129' })),
        );
        const result = await service.trigger(config, actor);
        expect(result.executionId).toBe('129');
      }
    });
  });

  describe('trigger — error mapping', () => {
    it('should throw BadGatewayException when the response status is non-2xx', async () => {
      httpService.post.mockReturnValue(
        of(mockResponse(500, { WorkflowInstance: '129' })),
      );
      await expect(service.trigger(config, actor)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('should throw BadGatewayException when the response body is not an object', async () => {
      httpService.post.mockReturnValue(of(mockResponse(200, 'not-json')));
      await expect(service.trigger(config, actor)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('should throw BadGatewayException when WorkflowInstance is an empty string', async () => {
      httpService.post.mockReturnValue(
        of(mockResponse(200, { WorkflowId: 'x', WorkflowInstance: '' })),
      );
      await expect(service.trigger(config, actor)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('should throw BadGatewayException on network error', async () => {
      httpService.post.mockReturnValue(
        throwError(() => new AxiosError('Network error')),
      );
      await expect(service.trigger(config, actor)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('should pass timeout to axios (the axios timeout option enforces the 10s limit)', async () => {
      httpService.post.mockReturnValue(
        of(mockResponse(200, { WorkflowInstance: '129' })),
      );
      await service.trigger(config, actor);
      const [, , options] = httpService.post.mock.calls[0];
      expect(options.timeout).toBe(10_000);
    });
  });
});
