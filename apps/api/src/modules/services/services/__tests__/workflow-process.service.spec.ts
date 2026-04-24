import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Logger } from '@nestjs/common';
import { AxiosError, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { WorkflowProcessService } from '../workflow-process.service';

describe('WorkflowProcessService', () => {
  let service: WorkflowProcessService;
  let httpService: { get: jest.Mock };
  let configService: { get: jest.Mock };

  const WORKFLOW_API_URL = 'https://n8n.example.com';
  const WORKFLOW_ID = 'wf-abc-123';

  const baseConfig = {
    apiKey: 'api-key-xyz',
    tenantId: '55555555-5555-4555-8555-555555555555',
    workflowId: WORKFLOW_ID,
  };

  const mockResponse = (status: number, data: unknown): AxiosResponse<unknown> =>
    ({
      status,
      data,
      statusText: '',
      headers: {},
      config: {},
    }) as AxiosResponse<unknown>;

  const linearWorkflowBody = {
    id: WORKFLOW_ID,
    name: 'Intake Workflow',
    nodes: [
      {
        id: 'node-trigger',
        name: 'On webhook call',
        type: 'n8n-nodes-base.webhook',
      },
      {
        id: 'node-a',
        name: 'Request Form Applicant Info',
        type: 'n8n-nodes-base.set',
        notes: 'Applicant completes the intake form.',
      },
      {
        id: 'node-b',
        name: 'Request Form Review',
        type: 'n8n-nodes-base.set',
      },
    ],
    connections: {
      'On webhook call': {
        main: [
          [{ node: 'Request Form Applicant Info', type: 'main', index: 0 }],
        ],
      },
      'Request Form Applicant Info': {
        main: [[{ node: 'Request Form Review', type: 'main', index: 0 }]],
      },
    },
  };

  beforeEach(() => {
    httpService = { get: jest.fn() };
    configService = {
      get: jest.fn((key: string) =>
        key === 'WORKFLOW_API_URL' ? WORKFLOW_API_URL : undefined,
      ),
    };
    service = new WorkflowProcessService(
      httpService as unknown as HttpService,
      configService as never,
    );
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('request construction', () => {
    it('should GET {WORKFLOW_API_URL}/api/v1/workflows/{workflowId}', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, linearWorkflowBody)));
      await service.fetch(baseConfig);
      expect(httpService.get).toHaveBeenCalledWith(
        `${WORKFLOW_API_URL}/api/v1/workflows/${WORKFLOW_ID}`,
        expect.any(Object),
      );
    });

    it('should handle a trailing slash on WORKFLOW_API_URL without double-slashing', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'WORKFLOW_API_URL' ? `${WORKFLOW_API_URL}/` : undefined,
      );
      httpService.get.mockReturnValue(of(mockResponse(200, linearWorkflowBody)));
      await service.fetch(baseConfig);
      expect(httpService.get).toHaveBeenCalledWith(
        `${WORKFLOW_API_URL}/api/v1/workflows/${WORKFLOW_ID}`,
        expect.any(Object),
      );
    });

    it('should send X-N8N-API-KEY and X-TENANT-ID headers from the workflow config', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, linearWorkflowBody)));
      await service.fetch(baseConfig);
      const [, options] = httpService.get.mock.calls[0];
      expect(options.headers['X-N8N-API-KEY']).toBe(baseConfig.apiKey);
      expect(options.headers['X-TENANT-ID']).toBe(baseConfig.tenantId);
    });

    it('should set a 10s request timeout and validateStatus:() => true', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, linearWorkflowBody)));
      await service.fetch(baseConfig);
      const [, options] = httpService.get.mock.calls[0];
      expect(options.timeout).toBe(10_000);
      expect(options.validateStatus(599)).toBe(true);
      expect(options.validateStatus(200)).toBe(true);
    });
  });

  describe('transform — node traversal', () => {
    it('should map a linear trigger → A → B body to steps [A, B] (trigger excluded)', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, linearWorkflowBody)));
      const result = await service.fetch(baseConfig);
      expect(result.steps).toEqual([
        {
          id: 'node-a',
          label: 'Submit Form Applicant Info',
          description: 'Applicant completes the intake form.',
        },
        { id: 'node-b', label: 'Submit Form Review' },
      ]);
    });

    it('should drop a disabled node from the output but still traverse its successors', async () => {
      const body = {
        ...linearWorkflowBody,
        nodes: [
          linearWorkflowBody.nodes[0],
          { ...linearWorkflowBody.nodes[1], disabled: true },
          linearWorkflowBody.nodes[2],
        ],
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps.map((s) => s.id)).toEqual(['node-b']);
    });

    it('should omit description when notes is missing, empty, or whitespace-only', async () => {
      const body = {
        ...linearWorkflowBody,
        nodes: [
          linearWorkflowBody.nodes[0],
          { ...linearWorkflowBody.nodes[1], notes: '   ' },
          { ...linearWorkflowBody.nodes[2], notes: '' },
        ],
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps[0].description).toBeUndefined();
      expect(result.steps[1].description).toBeUndefined();
    });

    it('should include description (trimmed) when notes has content', async () => {
      const body = {
        ...linearWorkflowBody,
        nodes: [
          linearWorkflowBody.nodes[0],
          { ...linearWorkflowBody.nodes[1], notes: '  some note  ' },
          linearWorkflowBody.nodes[2],
        ],
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps[0].description).toBe('some note');
    });

    it('should stop silently when traversal re-visits a node id (cycle safety)', async () => {
      const body = {
        ...linearWorkflowBody,
        connections: {
          'On webhook call': {
            main: [
              [{ node: 'Request Form Applicant Info', type: 'main', index: 0 }],
            ],
          },
          'Request Form Applicant Info': {
            main: [[{ node: 'Request Form Review', type: 'main', index: 0 }]],
          },
          'Request Form Review': {
            main: [
              [{ node: 'Request Form Applicant Info', type: 'main', index: 0 }],
            ], // cycle back
          },
        },
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps.map((s) => s.id).sort()).toEqual(['node-a', 'node-b']);
    });

    it('should follow only main branch index 0 — ignore additional main branches for v1', async () => {
      const body = {
        ...linearWorkflowBody,
        nodes: [
          ...linearWorkflowBody.nodes,
          { id: 'node-c', name: 'Request Form Alt', type: 'n8n-nodes-base.set' },
        ],
        connections: {
          'On webhook call': {
            main: [
              [{ node: 'Request Form Applicant Info', type: 'main', index: 0 }],
              [{ node: 'Request Form Alt', type: 'main', index: 0 }], // branch 1 — ignored
            ],
          },
          'Request Form Applicant Info': {
            main: [[{ node: 'Request Form Review', type: 'main', index: 0 }]],
          },
        },
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps.map((s) => s.id)).not.toContain('node-c');
    });

    it('should return { steps: [] } when the workflow has only a trigger node', async () => {
      const body = {
        id: WORKFLOW_ID,
        name: 'Trigger-only',
        nodes: [linearWorkflowBody.nodes[0]],
        connections: {},
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps).toEqual([]);
    });

    it('should return steps in deterministic BFS order across repeated runs', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, linearWorkflowBody)));
      const run1 = await service.fetch(baseConfig);
      httpService.get.mockReturnValue(of(mockResponse(200, linearWorkflowBody)));
      const run2 = await service.fetch(baseConfig);
      expect(run1.steps).toEqual(run2.steps);
    });
  });

  describe('transform — trigger detection', () => {
    it('should treat a node with type ending in ".webhook" as the trigger', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, linearWorkflowBody)));
      const result = await service.fetch(baseConfig);
      expect(result.steps.map((s) => s.id)).toEqual(['node-a', 'node-b']);
    });

    it('should treat a node with type ending in "Trigger" (e.g. scheduleTrigger) as the trigger', async () => {
      const body = {
        ...linearWorkflowBody,
        nodes: [
          {
            ...linearWorkflowBody.nodes[0],
            type: 'n8n-nodes-base.scheduleTrigger',
          },
          linearWorkflowBody.nodes[1],
          linearWorkflowBody.nodes[2],
        ],
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps.length).toBe(2);
    });

    it('should throw BadGatewayException when no detectable trigger node is present', async () => {
      const body = {
        ...linearWorkflowBody,
        nodes: [
          { ...linearWorkflowBody.nodes[0], type: 'n8n-nodes-base.set' },
          linearWorkflowBody.nodes[1],
        ],
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      await expect(service.fetch(baseConfig)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('should ignore a trigger node that is disabled and use the next detectable one', async () => {
      const body = {
        ...linearWorkflowBody,
        nodes: [
          { ...linearWorkflowBody.nodes[0], disabled: true },
          {
            id: 'node-trigger-2',
            name: 'Other webhook',
            type: 'n8n-nodes-base.webhook',
          },
          linearWorkflowBody.nodes[1],
        ],
        connections: {
          'Other webhook': {
            main: [
              [{ node: 'Request Form Applicant Info', type: 'main', index: 0 }],
            ],
          },
        },
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps.map((s) => s.id)).toEqual(['node-a']);
    });
  });

  describe('error mapping', () => {
    it('should throw BadGatewayException on network error (axios rejects)', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new AxiosError('connection reset')),
      );
      await expect(service.fetch(baseConfig)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('should throw BadGatewayException on non-2xx response status', async () => {
      httpService.get.mockReturnValue(of(mockResponse(500, { error: 'boom' })));
      await expect(service.fetch(baseConfig)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('should throw BadGatewayException when the response body is not an object', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, 'unexpected string')));
      await expect(service.fetch(baseConfig)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('should throw BadGatewayException when nodes is missing or not an array', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { connections: {} })),
      );
      await expect(service.fetch(baseConfig)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('should throw BadGatewayException when connections is missing or not an object', async () => {
      httpService.get.mockReturnValue(
        of(mockResponse(200, { nodes: [] })),
      );
      await expect(service.fetch(baseConfig)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('should not leak apiKey or tenantId in thrown error messages or logs', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn');
      httpService.get.mockReturnValue(of(mockResponse(500, {})));
      await expect(service.fetch(baseConfig)).rejects.toThrow(
        /Workflow fetch failed/i,
      );
      const loggedMessages = warn.mock.calls
        .flat()
        .map((m) => String(m))
        .join(' ');
      expect(loggedMessages).not.toContain(baseConfig.apiKey);
      expect(loggedMessages).not.toContain(baseConfig.tenantId);
    });
  });

  describe('step filter — keep only "Request Form *" relabelled to "Submit Form *"', () => {
    const filterWorkflowBody = {
      id: WORKFLOW_ID,
      name: 'Filtered Workflow',
      nodes: [
        {
          id: 'node-trigger',
          name: 'Start',
          type: 'n8n-nodes-base.webhook',
        },
        {
          id: 'node-a',
          name: 'Request Form Applicant Info',
          type: 'n8n-nodes-base.set',
        },
        {
          id: 'node-b',
          name: 'Internal Housekeeping',
          type: 'n8n-nodes-base.set',
        },
        {
          id: 'node-c',
          name: 'Request Form Documents',
          type: 'n8n-nodes-base.set',
        },
        {
          id: 'node-d',
          name: 'Notify Reviewer',
          type: 'n8n-nodes-base.set',
        },
      ],
      connections: {
        Start: {
          main: [
            [{ node: 'Request Form Applicant Info', type: 'main', index: 0 }],
          ],
        },
        'Request Form Applicant Info': {
          main: [[{ node: 'Internal Housekeeping', type: 'main', index: 0 }]],
        },
        'Internal Housekeeping': {
          main: [[{ node: 'Request Form Documents', type: 'main', index: 0 }]],
        },
        'Request Form Documents': {
          main: [[{ node: 'Notify Reviewer', type: 'main', index: 0 }]],
        },
      },
    };

    it('should drop steps whose label does not start with "Request Form "', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, filterWorkflowBody)));
      const result = await service.fetch(baseConfig);
      const ids = result.steps.map((s) => s.id);
      expect(ids).not.toContain('node-b');
      expect(ids).not.toContain('node-d');
    });

    it('should keep every matching step and relabel prefix "Request Form " → "Submit Form "', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, filterWorkflowBody)));
      const result = await service.fetch(baseConfig);
      expect(result.steps).toEqual([
        { id: 'node-a', label: 'Submit Form Applicant Info' },
        { id: 'node-c', label: 'Submit Form Documents' },
      ]);
    });

    it('should preserve BFS order among matching steps after filtering', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, filterWorkflowBody)));
      const result = await service.fetch(baseConfig);
      expect(result.steps.map((s) => s.id)).toEqual(['node-a', 'node-c']);
    });

    it('should return { steps: [] } when no node names start with "Request Form "', async () => {
      const body = {
        ...filterWorkflowBody,
        nodes: [
          filterWorkflowBody.nodes[0],
          {
            id: 'node-only',
            name: 'Other Name',
            type: 'n8n-nodes-base.set',
          },
        ],
        connections: {
          Start: {
            main: [[{ node: 'Other Name', type: 'main', index: 0 }]],
          },
        },
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps).toEqual([]);
    });

    it('should NOT match names that merely contain "Request Form" in the middle', async () => {
      const body = {
        ...filterWorkflowBody,
        nodes: [
          filterWorkflowBody.nodes[0],
          {
            id: 'node-mid',
            name: 'Review Request Form Response',
            type: 'n8n-nodes-base.set',
          },
        ],
        connections: {
          Start: {
            main: [
              [{ node: 'Review Request Form Response', type: 'main', index: 0 }],
            ],
          },
        },
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps).toEqual([]);
    });

    it('should preserve description on matching steps', async () => {
      const body = {
        ...filterWorkflowBody,
        nodes: [
          filterWorkflowBody.nodes[0],
          {
            ...filterWorkflowBody.nodes[1],
            notes: 'Applicant provides their info.',
          },
        ],
        connections: {
          Start: {
            main: [
              [{ node: 'Request Form Applicant Info', type: 'main', index: 0 }],
            ],
          },
        },
      };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.steps).toEqual([
        {
          id: 'node-a',
          label: 'Submit Form Applicant Info',
          description: 'Applicant provides their info.',
        },
      ]);
    });
  });

  describe('response shape', () => {
    it('should return { workflowId, name, steps } with workflowId echoing the upstream id', async () => {
      httpService.get.mockReturnValue(of(mockResponse(200, linearWorkflowBody)));
      const result = await service.fetch(baseConfig);
      expect(result).toMatchObject({
        workflowId: WORKFLOW_ID,
        name: 'Intake Workflow',
        steps: expect.any(Array),
      });
    });

    it('should copy the upstream workflow name verbatim', async () => {
      const body = { ...linearWorkflowBody, name: 'My Particular Workflow' };
      httpService.get.mockReturnValue(of(mockResponse(200, body)));
      const result = await service.fetch(baseConfig);
      expect(result.name).toBe('My Particular Workflow');
    });
  });
});
